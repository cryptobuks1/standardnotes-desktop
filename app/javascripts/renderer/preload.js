import { IpcMessages } from '../shared/ipcMessages';
const {
  Transmitter,
  FrameMessageBus,
  Validation,
} = require('sn-electron-valence/Transmitter');
import { ipcRenderer, remote } from 'electron';
import path from 'path';

const rendererPath = path.join('file://', __dirname, '/renderer.js');

const { PropertyType } = Validation;
const messageBus = new FrameMessageBus();
const transmitter = new Transmitter(messageBus, {
  baseUrl: PropertyType.VALUE,
  isMacOS: PropertyType.VALUE,
  appVersion: PropertyType.VALUE,
  extServerHost: PropertyType.VALUE,
  useSystemMenuBar: PropertyType.VALUE,
  sendIpcMessage: {
    type: PropertyType.METHOD,
    argValidators: [{ type: 'string', minLength: 1 }, { type: 'object' }],
  },
  closeWindow: { type: PropertyType.METHOD },
  minimizeWindow: { type: PropertyType.METHOD },
  maximizeWindow: { type: PropertyType.METHOD },
  unmaximizeWindow: { type: PropertyType.METHOD },
  isWindowMaximized: { type: PropertyType.METHOD },
});

process.once('loaded', function () {
  loadTransmitter();
  listenForIpcEvents();
});

async function loadTransmitter() {
  transmitter.expose({
    baseUrl: await ipcRenderer.invoke(IpcMessages.WebRoot),
    extServerHost: await ipcRenderer.invoke(
      IpcMessages.ExtensionsServerAddress
    ),
    rendererPath,
    isMacOS: process.platform === 'darwin',
    appVersion: remote.app.getVersion(),
    useSystemMenuBar: await ipcRenderer.invoke(IpcMessages.UseSystemMenuBar),

    /**
     * All functions must be async, as electron-valence expects to run .then()
     * on them.
     */
    sendIpcMessage: async (message, data) => {
      ipcRenderer.send(message, data);
    },
    closeWindow: async () => {
      remote.getCurrentWindow().close();
    },
    minimizeWindow: async () => {
      remote.getCurrentWindow().minimize();
    },
    maximizeWindow: async () => {
      remote.getCurrentWindow().maximize();
    },
    unmaximizeWindow: async () => {
      remote.getCurrentWindow().unmaximize();
    },
    isWindowMaximized: async () => {
      return remote.getCurrentWindow().isMaximized();
    },
  });
}

function listenForIpcEvents() {
  const sendMessage = (message, payload = {}) => {
    window.postMessage(
      JSON.stringify({ message, data: payload }),
      rendererPath
    );
  };

  ipcRenderer.on(IpcMessages.UpdateAvailable, function (_event, data) {
    sendMessage(IpcMessages.UpdateAvailable, data);
  });

  ipcRenderer.on(IpcMessages.DownloadBackup, function (_event, data) {
    sendMessage(IpcMessages.DownloadBackup, data);
  });

  ipcRenderer.on(IpcMessages.FinishedSavingBackup, function (_event, data) {
    sendMessage(IpcMessages.FinishedSavingBackup, data);
  });

  ipcRenderer.on(IpcMessages.WindowBlurred, function (_event, data) {
    sendMessage(IpcMessages.WindowBlurred, data);
  });

  ipcRenderer.on(IpcMessages.WindowFocused, function (_event, data) {
    sendMessage(IpcMessages.WindowFocused, data);
  });

  ipcRenderer.on(IpcMessages.InstallComponentComplete, function (_event, data) {
    sendMessage(IpcMessages.InstallComponentComplete, data);
  });
}
