if (!window._genesys) window._genesys = {};
if (!window._genesys.widgets) window._genesys.widgets = {};
if (!window._genesys.widgets.extensions)
  window._genesys.widgets.extensions = {};

/**
 * Registers the Uploader Extension to the GENESYS Widget
 * This code is automatically called by the GENESYS framework
 */
window._genesys.widgets.extensions["Uploader"] = function ($, CXBus, Common) {
  let plugin = CXBus.registerPlugin("Uploader");

  plugin.subscribe("WebChat.opened", function (e) {
    console.log("Chat Opened, event:", e);
    AddUploadMenuItem(document.getElementsByClassName("cx-menu")[0]);
  });

  plugin.subscribe("WebChatService.ended", function (e) {
    console.log("Chat ended, event:", e);
    document.getElementById("upload-file").style["display"] = "none";
  });

  plugin.registerCommand("uploadFile", async function (e) {
    console.log("Uploader Upload Command, event:", e);
    try {
      let message = await UploadFile(e.data.file);

      if (message) {
        await CXBus.command("WebChatService.sendMessage", { message });
      }
      e.deferred.resolve();
    } catch (err) {
      e.deferred.reject(err);
    }
  });

  plugin.republish("ready");

  plugin.ready();
};

/**
 * Upload the given file to the Storage configured in the Widget Configuration
 * The upload() method is created by the customer in the Widget Configuration
 *
 * @param {File}              file The file to send/upload
 * @returns {Promise<string>}      The Markdown message to send to the Chat
 */
async function UploadFile(file) {
  if (!window._genesys.widgets.uploader.upload) {
    throw "Uploader config is missing an upload method";
  }
  console.log("File to send: ", file);
  let results = await window._genesys.widgets.uploader.upload(file);
  return `[![](${results.thumbnailUrl})](${results.contentUrl})`;
}

/**
 * Adds a file input to the Widget's menu
 *
 * @param {Element} menu
 */
function AddUploadMenuItem(menu) {
  // fileInput is the element that performs the file upload after choosing it
  let fileInput = document.createElement("input");
  fileInput.setAttribute("type", "file");
  fileInput.setAttribute("id", "choosefile");
  fileInput.className = "inputfile";
  fileInput.onchange = async function (event) {
    console.log("OnChange: ", event);
    if (
      event &&
      event.target &&
      event.target.files &&
      event.target.files.length > 0
    ) {
      await CXBus.command("Uploader.uploadFile", {
        file: event.target.files[0],
      });
      event.target.value = ""; // Clear the FileList
    }
  };

  // fileLabel is the element that displays a nice paperclip
  let fileLabel = document.createElement("label");
  fileLabel.setAttribute("for", "choosefile");
  fileLabel.innerHTML =
    '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" viewBox="0 0 100 100"><path class="cx-svg-icon-tone1" d="M64.7,35.7l-6.3-6.3L30.6,57.3c-5.2,5.2-5.2,13.6,0,18.8c5.2,5.2,13.6,5.2,18.8,0l37.7-37.7c8.7-8.7,8.7-22.7,0-31.4c-8.7-8.7-22.7-8.5-31.4,0.2c0,0-39.6,39.6-39.7,39.7C4,59,4,78.5,16.1,90.6c12.1,12.1,31.7,12,43.8-0.1c0,0,0-0.1,0.1-0.1v0l27-27l-6.3-6.3l-27,27l0,0c0,0-0.1,0.1-0.1,0.1c-8.6,8.6-22.6,8.6-31.2,0s-8.6-22.6,0-31.2c0,0,0.1-0.1,0.1-0.1l0,0L62,13.3c5.2-5.2,13.7-5.2,18.8,0c5.2,5.2,5.2,13.7,0,18.8L43.2,69.8c-1.7,1.7-4.5,1.7-6.3,0c-1.7-1.7-1.7-4.5,0-6.3L64.7,35.7z"></path></svg>';

  // cxUpload is the menu item (<li>) that contains for the input and the label
  let cxUpload = document.createElement("li");
  cxUpload.className = "cx-icon i18n";
  cxUpload.setAttribute("tabindex", 0);
  cxUpload.setAttribute("id", "upload-file");
  cxUpload.setAttribute("title", "Attach Files");
  cxUpload.style.display = "block";
  cxUpload.appendChild(fileInput);
  cxUpload.appendChild(fileLabel);

  // we want to append the uploader after the emoji pickup
  if (menu.childNodes.length > 2) {
    menu.insertBefore(cxUpload, menu.childNodes[2]);
  } else if (menu.childNodes.length > 1) {
    menu.insertBefore(cxUpload, menu.childNodes[1]);
  } else {
    menu.appendChild(cxUpload);
  }
}
