import { useState, useCallback, useEffect, useRef } from 'react';

let sharedWorker = null;
const callbacks = new Map();
let idCounter = 0;
let hasLoaded = false;

function getSharedWorker() {
  if (!sharedWorker) {
    // Using standard syntax for Vite
    sharedWorker = new Worker(new URL('./pyodideWorker.js', import.meta.url));
    
    sharedWorker.onmessage = (e) => {
      const { id, success, stdout, error, trace } = e.data;
      const callback = callbacks.get(id);
      
      if (callback) {
        callbacks.delete(id);
        callback({ success, stdout, error, trace });
      }
    };
  }
  return sharedWorker;
}

export function usePyodideRunner() {
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const runCode = useCallback(async (code) => {
    return new Promise((resolve) => {
      const worker = getSharedWorker();
      
      if (!hasLoaded) {
        setIsLoading(true);
      }
      setIsRunning(true);
      
      const id = ++idCounter;
      callbacks.set(id, (result) => {
        hasLoaded = true;
        if (isMounted.current) {
          setIsLoading(false);
          setIsRunning(false);
        }
        resolve(result);
      });
      
      worker.postMessage({ id, code });
    });
  }, []);

  return { runCode, isLoading, isRunning };
}
