let ioInstance = null;
let connectionStateInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

function setConnectionState(state) {
  connectionStateInstance = state;
}

function getConnectionState() {
  return connectionStateInstance;
}

export { setIO, getIO, setConnectionState, getConnectionState };
export default { setIO, getIO, setConnectionState, getConnectionState };
