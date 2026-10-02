// Hesabı ana iş parçacığından ayırır; index.html tarafından kullanılır.
importScripts('nesting.js');

onmessage = function (ev) {
  const { id, tris, opts } = ev.data;
  try {
    const result = MjfNesting.computeNesting(tris, opts);
    postMessage({ id, result });
  } catch (err) {
    postMessage({ id, error: err && err.message ? err.message : String(err) });
  }
};
