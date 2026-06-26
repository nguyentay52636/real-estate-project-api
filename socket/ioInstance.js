let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

export { setIO, getIO };
export default { setIO, getIO };