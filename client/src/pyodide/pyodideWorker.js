importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodideReadyPromise;

async function loadPyodideAndPackages() {
  self.pyodide = await loadPyodide();
  await self.pyodide.runPythonAsync(`
import sys
import io
import time
import traceback

class ExecutionTracer:
    def __init__(self, code, timeout_ms=5000):
        self.code = code
        self.timeout_ms = timeout_ms
        self.start_time = 0
        self.trace = []
        
    def trace_calls(self, frame, event, arg):
        if (time.time() * 1000) - self.start_time > self.timeout_ms:
            raise TimeoutError("Took too long — check for infinite loops.")
            
        if event == 'line':
            if frame.f_code.co_filename == "<string>":
                locals_dict = {}
                for k, v in frame.f_locals.items():
                    if not k.startswith('__'):
                        try:
                            locals_dict[k] = repr(v)
                        except Exception:
                            locals_dict[k] = "<unrepresentable>"
                self.trace.append({
                    "line": frame.f_lineno,
                    "locals": locals_dict
                })
        return self.trace_calls

    def run(self):
        self.start_time = time.time() * 1000
        self.trace = []
        
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        
        error = None
        tb_str = None
        
        try:
            sys.settrace(self.trace_calls)
            namespace = {"__name__": "__main__"}
            compiled = compile(self.code, "<string>", "exec")
            exec(compiled, namespace)
        except TimeoutError as e:
            error = str(e)
        except Exception as e:
            error = str(e)
            tb_str = traceback.format_exc()
        finally:
            sys.settrace(None)
            stdout = sys.stdout.getvalue()
            sys.stdout = old_stdout
            
        return {
            "stdout": stdout,
            "error": error,
            "traceback": tb_str,
            "trace": self.trace
        }
  `);
}

pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
  const { id, code } = event.data;
  if (code === undefined) return;
  
  try {
    await pyodideReadyPromise;
    self.pyodide.globals.set("user_code", code);
    
    const resultProxy = await self.pyodide.runPythonAsync(`
tracer = ExecutionTracer(user_code)
tracer.run()
    `);
    
    const result = resultProxy.toJs({ dict_converter: Object.fromEntries });
    resultProxy.destroy();
    
    if (result.error) {
       self.postMessage({
         id,
         success: false,
         stdout: result.stdout,
         error: result.traceback || result.error,
         trace: result.trace
       });
    } else {
       self.postMessage({
         id,
         success: true,
         stdout: result.stdout,
         trace: result.trace
       });
    }
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
};
