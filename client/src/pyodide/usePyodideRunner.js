import { useRef, useState, useCallback, useEffect } from 'react';

export function usePyodideRunner() {
  const workerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
  const callbacksRef = useRef(new Map());
  const idCounterRef = useRef(0);
  const hasLoadedRef = useRef(false);

  const initWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    
    if (!hasLoadedRef.current) {
      setIsLoading(true);
    }
    
    // We use '?worker' for Vite to properly handle it, but sometimes new URL is enough. 
    // Using standard standard syntax:
    const worker = new Worker(new URL('./pyodideWorker.js', import.meta.url));
    
    worker.onmessage = (e) => {
      const { id, success, stdout, error, trace } = e.data;
      const callback = callbacksRef.current.get(id);
      
      if (callback) {
        callbacksRef.current.delete(id);
        callback({ success, stdout, error, trace });
      }
    };
    
    workerRef.current = worker;
    return worker;
  }, []);

  const runCode = useCallback(async (code) => {
    return new Promise((resolve) => {
      const worker = initWorker();
      
      setIsRunning(true);
      
      const id = ++idCounterRef.current;
      callbacksRef.current.set(id, (result) => {
        setIsLoading(false);
        hasLoadedRef.current = true;
        setIsRunning(false);
        resolve(result);
      });
      
      worker.postMessage({ id, code });
    });
  }, [initWorker]);

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  return { runCode, isLoading, isRunning };
}
