if (!window._genesys) window._genesys = {};
if (!window._genesys.widgets) window._genesys.widgets = {};
if (!window._genesys.widgets.extensions)
  window._genesys.widgets.extensions = {};

var Common = window._genesys.widgets.Common;

/**
 * Registers the Uploader Extension to the GENESYS Widget
 * This code is automatically called by the GENESYS framework
 */
window._genesys.widgets.extensions["RichMessage"] = function (
  $,
  CXBus,
  Common
) {
  var plugin = CXBus.registerPlugin("RichMessage");

  plugin.command("WebChatService.registerPreProcessor", {
    preprocessor: (message) => {
      Log("Analyzing: ", message);
      if (Common) {
        Common.log("Via Common... Analyzing ", message);
      } else {
        Log("Common Log is not available");
      }
      if (message.type === "Message") {
        if (!message.text) return message;
        let text = message.text.trim();

        if (text.startsWith("![{")) {
          text = text.substring(2, text.lastIndexOf("]("));
        }
        if (text.startsWith("{")) {
          Array.from(
            document.querySelectorAll(".cx-message.cx-agent-typing.cx-them")
          ).forEach((element) => element.remove());
          Array.from(
            document.querySelectorAll(".cx-quick-replies")
          ).forEach((element) => element.remove());
          try {
            let richmessage = JSON.parse(text);
            Log("Found Rich Message: ", richmessage);
            message.text = CreateRichMessageElement(
              plugin,
              message.index,
              richmessage
            );
            //message.html = true
          } catch (e) {
            Error("Invalid JSON: ", text, "Error: ", e);
            return message;
          }
        }
      }
    },
  });

  plugin.republish("ready");
  plugin.ready();
};

/**
 * Create an HTML Element from a GENESYS JSON representation
 *
 * @param {*}       plugin    the plugin
 * @param {string}  messageId the message id from GCloud
 * @param {*}       message   the object to create from
 * @returns {Element}
 */
function CreateRichMessageElement(plugin, messageId, message) {
  if (!message.type) throw `Missing Message Type`;
  switch (message.type) {
    case "Structured": {
      if (!message.contentType) throw `Missing Message Content Type`;
      if (!message.content) message.content = [];
      if (!Array.isArray(message.content))
        throw `Expected Array for Message Content`;
      if (message.content.length < 1) return; // nothing to do if the content is empty
      switch (message.contentType) {
        case "quick-replies": {
          let cxQuickReplies = CreateQuickRepliesElement(
            plugin,
            messageId,
            message
          );
          AppendChild(`cx-chat-index-${messageId}`, cxQuickReplies);
          AppendReaderTranscript(cxQuickReplies);
          Transcript().scrollTop = 99999999;
          return message.text;
        }
        case "generic": {
          let cxGeneric =
            message.content.length > 1
              ? CreateCarouselElement(
                  plugin,
                  messageId,
                  message,
                  CreateGenericTemplateElement
                )
              : CreateGenericTemplateElement(
                  plugin,
                  messageId,
                  message.content[0]
                );
          AppendChild(`cx-chat-index-${messageId}`, cxGeneric, {
            richMessage: true,
            removeText: true,
            moveTime: true,
          });
          AppendReaderTranscript(cxGeneric);
          Transcript().scrollTop = 99999999;
          return "縲"; // Japanese space, so the string is not empty, otherwise WebChatService will not do anything
        }
        case "list-vertical": {
          let cxList =
            message.content.length > 1
              ? CreateCarouselElement(
                  plugin,
                  messageId,
                  message,
                  CreateListVerticalTemplateElement
                )
              : CreateListVerticalTemplateElement(
                  plugin,
                  messageId,
                  message.content[0]
                );
          AppendChild(`cx-chat-index-${messageId}`, cxList, {
            richMessage: true,
            removeText: true,
            moveTime: true,
          });
          AppendReaderTranscript(cxList);
          Transcript().scrollTop = 99999999;
          return "縲"; // Japanese space, so the string is not empty, otherwise WebChatService will not do anything
        }
        case "single-selection-list": {
          let cxList =
            message.content.length > 1
              ? CreateCarouselElement(
                  plugin,
                  messageId,
                  message,
                  CreateSingleSelectionListTemplateElement
                )
              : CreateSingleSelectionListTemplateElement(
                  plugin,
                  messageId,
                  message.content[0]
                );
          AppendChild(`cx-chat-index-${messageId}`, cxList, {
            richMessage: true,
            removeText: true,
            moveTime: true,
          });
          AppendReaderTranscript(cxList);
          Transcript().scrollTop = 99999999;
          return "縲"; // Japanese space, so the string is not empty, otherwise WebChatService will not do anything
        }
        default:
          throw `Unsupported Message Content Type: ${message.contentType}`;
      }
      break;
    }
    default:
      throw `Unsupported Message type: ${message.type}`;
  }
}

/**
 * Create an HTML Element from a Quick Replies
 *
 * @param {*}       plugin    the plugin
 * @param {string}  messageId the message id from GCloud
 * @param {*}       message   the object to create from
 * @returns {Element}
 */
function CreateQuickRepliesElement(plugin, messageId, message) {
  // Design: https://docs.genesys.com/Documentation/GWC/Current/Deployment/GWCRM#QRep
  Log(`Message: ${messageId}, Creating Quick Replies`);
  let cxComponent = CreateElement({
    type: "div",
    classes: "cx-quick-replies cx-rich-media",
  });

  message.content
    .sort((a, b) => a.id - b.id)
    .forEach((content) => {
      switch (content.type) {
        case "quick-reply": {
          Log(
            `Message: ${messageId}, Adding Quick Reply id ${content.id} ${content.action} action`
          );
          let cxQuickReply = CreateElement({
            type: "div",
            classes: "cx-quick-reply cx-component",
            attributes: {
              rmid: content.id,
              "reply-text": content.text,
              "style-group": "1",
              actions: "", // TODO: Not sure what we should put in here
            },
            parent: cxComponent,
            onclick: async function (event) {
              return await QuickReplySubmit(event, plugin);
            },
          });
          switch (content.action) {
            case "message": {
              CreateElement({
                type: "div",
                attributes: { "style-group": "2" },
                text: content.text,
                parent: cxQuickReply,
              });
              // TODO: take care of content.image and content.imageText
              break;
            }
            default:
              console.warn(
                `Message: ${messageId}, Unsupported action: ${content.action}, ignoring`
              );
          }
          break;
        }
        default:
          console.warn(
            `Message: ${messageId}, Unsupported content type: ${content.type}, ignoring`
          );
      }
    });
  return cxComponent;
}

/**
 * Execute the submit code of a QuickReply
 * @param {MouseEvent} event
 * @param {Object}     bus
 */
async function QuickReplySubmit(event, bus) {
  event = event || window.event;
  let action = event.target;
  let quickReply = action.parentElement;
  let quickReplies = quickReply.parentElement;
  let message = quickReplies.parentElement;
  try {
    await bus.command("WebChatService.sendMessage", {
      parentMessageId: message.id.split("-").pop(),
      message: quickReply.getAttribute("reply-text"),
    });
  } catch (e) {
    console.error("Failed to Send Message", e);
  }
  quickReplies.remove();
  Transcript().scrollTop = 99999999;
}

/**
 * This callback is called by the carousel creator to create each carousel card
 * @callback createTemplateCallback
 * @param {*}       plugin    the plugin
 * @param {string}  messageId the message id from GCloud
 * @param {*}       content   the object to create from
 * @returns {Element}
 */

/**
 * Create an HTML Element from a Generic
 *
 * @param {*}                      plugin                the plugin
 * @param {string}                 messageId             the message id from GCloud
 * @param {*}                      message               the object to create from
 * @param {createTemplateCallback} createTemplateElement the function to create the templates
 * @returns {Element}
 */
function CreateCarouselElement(
  plugin,
  messageId,
  message,
  createTemplateElement
) {
  // Design: https://docs.genesys.com/Documentation/GWC/Current/Deployment/GWCRM#Caro
  Log(`Message: ${messageId}, Creating Carousel`);

  let cxComponent = CreateElement({
    type: "div",
    classes: "cx-carousel",
    attributes: { "arial-label": "carousel" },
  });
  let cxContainer = CreateElement({
    type: "div",
    classes: "cx-carousel-container",
    parent: cxComponent,
  });

  message.content.forEach((content, index) => {
    let cxSlide = CreateElement({
      type: "div",
      classes: `cx-slide ${index === 0 ? "active" : ""} ${
        index === 1 ? "next" : ""
      }`,
      attributes: {
        id: `cx-slide-${messageId}-${index}`,
        role: "region",
        "aria-label": `slide ${index + 1} out of ${message.content.length}`,
      },
      parent: cxContainer,
      children: [createTemplateElement(plugin, messageId, content)],
    });
  });
  CreateElement({
    type: "div",
    styles: { clear: "both" },
    parent: cxComponent,
  });
  CreateElement({
    type: "button",
    classes: "cx-next",
    attributes: {
      id: `cx-next-${messageId}`,
      title: "Next",
      "arial-label": "Next",
      slides: cxContainer.id,
    },
    styles: { display: DisplayAttribute(message.content.length > 1) },
    parent: cxComponent,
    onclick: CarouselNextSlide,
  });
  CreateElement({
    type: "button",
    classes: "cx-previous",
    attributes: {
      id: `cx-previous-${messageId}`,
      title: "Previous",
      "arial-label": "Previous",
      slides: cxContainer.id,
    },
    styles: { display: DisplayAttribute(false) },
    parent: cxComponent,
    onclick: CarouselPreviousSlide,
  });
  return cxComponent;
}

/**
 * Select the next slide in a carousel
 *
 * @param {MouseEvent} event
 */
function CarouselNextSlide(event) {
  event = event || window.event;
  let carousel = event.target.parentElement;
  let nextButton = event.target;
  let prevButton = carousel.querySelector(".cx-previous");
  let slides = carousel.querySelector(".cx-carousel-container");
  let activeSlide = [...slides.children].find((slide) =>
    slide.classList.contains("active")
  );
  if (!activeSlide) return;

  if (activeSlide.previousElementSibling) {
    activeSlide.previousElementSibling.classList.remove("prev");
  }
  if (activeSlide.nextElementSibling) {
    activeSlide.classList.add("prev");
    activeSlide.classList.remove(
      "active",
      "next",
      "cx-animate-next",
      "cx-animate-prev"
    );
    activeSlide.setAttribute("tabindex", "");

    activeSlide.nextElementSibling.classList.add("active", "cx-animate-next");
    activeSlide.nextElementSibling.classList.remove("next");
    activeSlide.nextElementSibling.setAttribute("tabindex", "0");
    activeSlide.nextElementSibling.focus();

    if (activeSlide.nextElementSibling.nextElementSibling) {
      activeSlide.nextElementSibling.nextElementSibling.classList.add("next");
    } else {
      nextButton.style.display = "none";
    }
    prevButton.style.display = "block";
  }
}

/**
 * Select the previous slide in a carousel
 *
 * @param {MouseEvent} event
 */
function CarouselPreviousSlide(event) {
  event = event || window.event;
  let carousel = event.target.parentElement;
  let nextButton = carousel.querySelector(".cx-next");
  let prevButton = event.target;
  let slides = carousel.querySelector(".cx-carousel-container");
  let activeSlide = [...slides.children].find((slide) =>
    slide.classList.contains("active")
  );
  if (!activeSlide) return;

  if (activeSlide.nextElementSibling) {
    activeSlide.nextElementSibling.classList.remove("next");
  }
  if (activeSlide.previousElementSibling) {
    activeSlide.classList.remove(
      "active",
      "prev",
      "cx-animate-prev",
      "cx-animate-next"
    );
    activeSlide.classList.add("next");
    activeSlide.setAttribute("tabindex", "");

    activeSlide.previousElementSibling.classList.add(
      "active",
      "cx-animate-prev"
    );
    activeSlide.previousElementSibling.classList.remove("prev");
    activeSlide.previousElementSibling.setAttribute("tabindex", "0");
    activeSlide.previousElementSibling.focus();

    if (activeSlide.previousElementSibling.previousElementSibling) {
      activeSlide.previousElementSibling.previousElementSibling.classList.add(
        "prev"
      );
    } else {
      prevButton.style.display = "none";
    }
    nextButton.style.display = "block";
  }
}

/**
 * Create an HTML Element from a Generic
 *
 * @param {*}       plugin    the plugin
 * @param {string}  messageId the message id from GCloud
 * @param {*}       content   the object to create from
 * @returns {Element}
 */
function CreateGenericTemplateElement(plugin, messageId, content) {
  // Design: https://docs.genesys.com/Documentation/GWC/Current/Deployment/GWCRM#GenTem
  content.components = content.components || [];
  content.actions = Object.assign(
    { url: "javascript:;", urlTarget: "_blank" },
    content.actions
  );
  if (!Array.isArray(content.components))
    throw `Message ${messageId}: Expected Array for Content's components`;
  Log(`Message: ${messageId}, Creating Generic Template`);
  let cxComponent = CreateElement({ type: "div", classes: "cx-rich-media" });
  let cxGeneric = CreateElement({
    type: "div",
    classes: "cx-structure cx-generic cx-media cx-var-4",
    attributes: { rmid: content.id, "style-group": "1" },
    parent: cxComponent,
  });
  let cxTopHalf = CreateElement({
    type: "div",
    classes: "cx-top-hald",
    attributes: { "style-group": "1" },
    parent: cxGeneric,
    children: [
      CreateElement({
        type: "div",
        classes: "cx-cta-link",
        attributes: {
          name: "image",
          rmid: "",
          href: content.actions.url,
          target: content.actions.urlTarget,
          actions: "",
        },
        children: [
          CreateElement({
            type: "img",
            classes: "cx-main-image",
            attributes: { src: content.image },
            styles: {
              display: DisplayAttribute(content.image && !content.video),
            },
          }),
          CreateElement({
            type: "video",
            attributes: {
              src: content.video,
              poster: content.image,
              controls: true,
            },
            styles: { display: DisplayAttribute(content.video) },
          }),
        ],
      }),
    ],
  });

  let cxBottomHalf = CreateElement({
    type: "div",
    attributes: { "style-group": "1" },
    parent: cxTopHalf,
    children: [
      CreateElement({
        type: "div",
        classes: "cx-cta-link",
        attributes: {
          name: "title",
          rmid: "",
          href: "javascript:;",
          target: "_blank",
          actions: "",
        },
        children: [
          CreateElement({
            type: "h1",
            attributes: { "style-group": "3" },
            styles: { display: DisplayAttribute(content.title) },
            text: content.title,
          }),
          CreateElement({
            type: "div",
            classes: "cx-cta-link",
            attributes: {
              name: "desc",
              href: "javascript:;",
              target: "_blank",
            },
            children: [
              CreateElement({
                type: "h2",
                classes: "cx-markdown",
                attributes: { "style-group": "3" },
                styles: { display: DisplayAttribute(content.desc) },
                text: `<p>${content.desc || ""}</p>`,
              }),
            ],
          }),
          CreateElement({
            type: "div",
            classes: "cx-spacer",
            styles: { display: DisplayAttribute(false) },
          }),
        ],
      }),
    ],
  });
  let cxComponents = CreateElement({
    type: "div",
    classes: "cx-components",
    styles: { display: DisplayAttribute(content.components.length > 0) },
    parent: cxBottomHalf,
  });

  content.components
    .sort((a, b) => a.id - b.id)
    .forEach((component, index) => {
      Log(`Message ${messageId}: Adding Component ${index}`, component);
      switch (component.type) {
        case "button": {
          component.actions = Object.assign(
            { url: "javascript:;", urlTarget: "_blank" },
            component.actions
          );
          CreateElement({
            type: "div",
            classes: "cx-component cx-cta-link cx-clickable",
            attributes: {
              name: "button",
              rmid: index,
              href: component.actions.url,
              target: component.actions.urlTarget,
              actions: "",
            },
            parent: cxComponents,
            children: [
              CreateElement({
                type: "button",
                classes: "cx-button cx-clickable",
                attributes: {
                  name: "button",
                  rmid: component.id,
                  title: component.title,
                  "style-group": "1",
                  actions: "",
                },
                text: component.text,
                onclick: async function (e) {
                  return await ActionsExecute(
                    e,
                    plugin,
                    messageId,
                    component.actions
                  );
                },
              }),
            ],
          });
          break;
        }
        default:
          console.warn(
            `Message ${messageId}: Unsupported Component Type: ${component.type}, ignored`
          );
      }
    });
  return cxComponent;
}

/**
 * Create an HTML Element from a List Vertical
 *
 * @param {*}       plugin    the plugin
 * @param {string}  messageId the message id from GCloud
 * @param {*}       content   the object to create from
 * @returns {Element}
 */
function CreateListVerticalTemplateElement(plugin, messageId, content) {
  // Design: https://docs.genesys.com/Documentation/GWC/Current/Deployment/GWCRM#LTemp
  content.components = content.components || [];
  if (!Array.isArray(content.components))
    throw `Message ${messageId}: Expected Array for Content's components`;
  Log(`Message: ${messageId}, Creating List Vertical Template`);
  let cxComponent = CreateElement({ type: "div", classes: "cx-rich-media" });
  let cxListVertical = CreateElement({
    type: "div",
    classes: "cx-structure cx-list",
    attributes: { rmid: content.id, "style-group": "1" },
    parent: cxComponent,
    children: [
      CreateElement({
        type: "h1",
        attributes: { "style-group": "3" },
        styles: { display: DisplayAttribute(content.title) },
        text: content.title,
      }),
      CreateElement({
        type: "h2",
        classes: "cx-markdown",
        attributes: { "style-group": "3" },
        styles: { display: DisplayAttribute(content.desc) },
        text: `<p>${content.desc || ""}</p>`,
      }),
    ],
  });
  let cxComponents = CreateElement({
    type: "div",
    classes: "cx-components",
    styles: { display: DisplayAttribute(content.components.length > 0) },
    parent: cxListVertical,
  });

  content.components
    .sort((a, b) => a.id - b.id)
    .forEach((component, index) => {
      Log(`Message ${messageId}: Adding Component ${index}`, component);
      switch (component.type) {
        case "list-item": {
          component.actions = Object.assign(
            { url: "javascript:;", urlTarget: "_blank" },
            component.actions
          );
          CreateElement({
            type: "div",
            classes: "cx-list-item cx-cta-link cx-component cx-clickable",
            attributes: {
              id: `rm-list-item-${messageId}-${component.id}`,
              name: "button",
              rmid: component.id,
              href: component.actions.url,
              target: component.actions.urlTarget,
              "style-group": "2",
              actions: "",
            },
            onclick: async function (e) {
              return await ActionsExecute(
                e,
                plugin,
                messageId,
                component.actions
              );
            },
            parent: cxComponents,
            children: [
              CreateElement({
                type: "div",
                classes: "cx-media cx-cta-link",
                children: [
                  CreateElement({
                    type: "img",
                    attributes: { src: component.image },
                    styles: { display: DisplayAttribute(component.image) },
                  }),
                ],
              }),
              CreateElement({
                type: "div",
                classes: "cx-text cx-cta-link",
                styles: { display: DisplayAttribute(true) },
                children: [
                  CreateElement({
                    type: "h3",
                    attributes: { "style-group": "3" },
                    styles: { display: DisplayAttribute(component.title) },
                    text: component.title,
                  }),
                  CreateElement({
                    type: "p",
                    classes: "cx-markdown",
                    attributes: { "style-group": "3" },
                    styles: { display: DisplayAttribute(component.desc) },
                    text: `<p>${component.desc || ""}</p>`,
                  }),
                ],
              }),
            ],
          });
          break;
        }
        default:
          console.warn(
            `Message ${messageId}: Unsupported Component Type: ${component.type}, ignored`
          );
      }
    });
  return cxComponent;
}

/**
 * Create an HTML Element from a Single Selection List
 *
 * @param {*}       plugin    the plugin
 * @param {string}  messageId the message id from GCloud
 * @param {*}       content   the object to create from
 * @returns {Element}
 */
function CreateSingleSelectionListTemplateElement(plugin, messageId, content) {
  // Design: https://docs.genesys.com/Documentation/GWC/Current/Deployment/GWCRM#LTemp
  // TODO: This is not finished! radios, checkbox, submit button (they are not working atm)
  content.components = content.components || [];
  if (!Array.isArray(content.components))
    throw `Message ${messageId}: Expected Array for Content's components`;
  Log(`Message: ${messageId}, Creating List Vertical Template`);
  let cxComponent = CreateElement({ type: "div", classes: "cx-rich-media" });
  let cxListVertical = CreateElement({
    type: "div",
    classes: "cx-structure cx-list",
    attributes: { rmid: content.id, "style-group": "1" },
    parent: cxComponent,
    children: [
      CreateElement({
        type: "h1",
        attributes: { "style-group": "3" },
        styles: { display: DisplayAttribute(content.title) },
        text: content.title,
      }),
      CreateElement({
        type: "h2",
        classes: "cx-markdown",
        attributes: { "style-group": "3" },
        styles: { display: DisplayAttribute(content.desc) },
        text: `<p>${content.desc || ""}</p>`,
      }),
    ],
  });
  let cxComponents = CreateElement({
    type: "div",
    classes: "cx-components",
    styles: { display: DisplayAttribute(content.components.length > 0) },
    parent: cxListVertical,
  });

  content.components
    .sort((a, b) => a.id - b.id)
    .forEach((component, index) => {
      Log(`Message ${messageId}: Adding Component ${index}`, component);
      switch (component.type) {
        case "list-item": {
          component.actions = Object.assign(
            { url: "javascript:;", urlTarget: "_blank" },
            component.actions
          );
          CreateElement({
            type: "div",
            classes: "cx-list-item cx-cta-link cx-component cx-clickable",
            attributes: {
              id: `rm-list-item-${messageId}-${component.id}`,
              name: "button",
              rmid: component.id,
              href: component.actions.url,
              target: component.actions.urlTarget,
              "style-group": "2",
              actions: "",
            },
            onclick: async function (e) {
              return await ActionsExecute(
                e,
                plugin,
                messageId,
                component.actions
              );
            },
            parent: cxComponents,
            children: [
              CreateElement({
                type: "div",
                classes: "cx-selectors",
                children: [
                  CreateElement({
                    type: "label",
                    attributes: {
                      htmlFor: `cx-checkbox-${messageId}-${content.id}-${component.id}`,
                    },
                    children: [
                      CreateElement({
                        type: "input",
                        attributes: {
                          type: "checkbox",
                          id: `cx-checkbox-${messageId}-${content.id}-${component.id}`,
                        },
                      }),
                    ],
                  }),
                  CreateElement({
                    type: "label",
                    attributes: {
                      htmlFor: `cx-radio-${messageId}-${content.id}-${component.id}`,
                    },
                    children: [
                      CreateElement({
                        type: "input",
                        attributes: {
                          type: "radio",
                          id: `cx-radio-${messageId}-${content.id}-${component.id}`,
                        },
                      }),
                    ],
                  }),
                ],
              }),
              CreateElement({
                type: "div",
                classes: "cx-media cx-cta-link",
                children: [
                  CreateElement({
                    type: "img",
                    attributes: { src: component.image },
                    styles: { display: DisplayAttribute(component.image) },
                  }),
                ],
              }),
              CreateElement({
                type: "div",
                classes: "cx-text cx-cta-link",
                styles: { display: DisplayAttribute(true) },
                children: [
                  CreateElement({
                    type: "h3",
                    attributes: { "style-group": "3" },
                    styles: { display: DisplayAttribute(component.title) },
                    text: component.title,
                  }),
                  CreateElement({
                    type: "p",
                    classes: "cx-markdown",
                    attributes: { "style-group": "3" },
                    styles: { display: DisplayAttribute(component.desc) },
                    text: `<p>${component.desc || ""}</p>`,
                  }),
                ],
              }),
            ],
          });
          break;
        }
        default:
          console.warn(
            `Message ${messageId}: Unsupported Component Type: ${component.type}, ignored`
          );
      }
    });

  CreateElement({
    type: "button",
    classes: "cx-button cx-submit",
    attributes: {
      name: "button",
      title: content.submitLabel,
      rmid: content.id,
      "style-group": "1",
      href: "javascript:;",
      target: "_blank",
      actions: "",
      "arial-label": content.arialSubmitLabel,
    },
    styles: { display: DisplayAttribute(false) },
    parent: cxListVertical,
    onclick: async function (e) {
      return await ActionsExecute(e, plugin, messageId, content.actions);
    },
  });

  return cxComponent;
}

/**
 * Executes Genesys Widget Actions
 * @param {Event}   event
 * @param {*}       plugin    the plugin
 * @param {string}  messageId the chat message identifier
 * @param {string}  value
 */
async function ActionsExecute(event, plugin, messageId, actions) {
  try {
    Log("Actions Submit", actions);
    if (actions.textback) {
      try {
        await plugin.command("WebChatService.sendMessage", {
          parentMessageId: messageId,
          message: actions.textback,
        });
      } catch (e) {
        console.error("Failed to send message", e);
      }
    }
    if (actions.commandName) {
      try {
        await plugin.command(actions.commandName, actions.commandOptions || {});
      } catch (e) {
        console.error(`Failed to execute command ${actions.commandName}`, e);
      }
    }

    if (actions.url && actions.url != "javascript:;") {
      if (actions.urlTarget && actions.urlTarget !== "_self") {
        window.open(actions.url, actions.urlTarget);
      } else {
        window.location.href = actions.url;
      }
    }
  } catch (e) {
    console.error("Failed to Parse Actions", value, e);
  }
}

/**
 * Tells if the given value should be displayed or not
 *
 * @param {*} value
 * @returns {string}
 */
function DisplayAttribute(value) {
  return value ? "block" : "none";
}

/**
 * Create a new Element
 *
 * @param   {Object}              params
 * @param   {string}              params.type          the HTML type
 * @param   {string}              [params.classes]     the class names
 * @param   {Object}              [params.attributes]  the attributes
 * @param   {Object}              [params.styles]      the style attributes
 * @param   {string}              [params.text='']     the innerHTML as a string
 * @param   {GlobalEventHandlers} [params.onclick]     the callback when clicked
 * @param   {[HTMLElement]}       [params.parent]      the parent Element object
 * @param   {[HTMLElement]}       [params.children=[]] the child Element objects
 * @returns {HTMLElement}                              the new Element
 */
function CreateElement({
  type,
  classes = "",
  text = "",
  attributes = {},
  styles = {},
  onclick = null,
  parent = null,
  children = [],
}) {
  let element = document.createElement(type);

  if (classes) element.className = classes;
  // Here we support simple attributes (i.e. no arrays, sub-objects, etc)
  for (var attribute in attributes) {
    if (Object.prototype.hasOwnProperty.call(attributes, attribute)) {
      element.setAttribute(attribute, attributes[attribute]);
    }
  }
  for (var style in styles) {
    if (Object.prototype.hasOwnProperty.call(styles, style)) {
      element.style[style] = styles[style];
    }
  }
  if (text) element.innerHTML = text;
  if (onclick) element.onclick = onclick;

  if (parent) parent.appendChild(element);
  children.forEach((child) => element.appendChild(child));

  return element;
}

/**
 * @typedef {Object} AppendChildOptions
 * @property {boolean} moveTime    true if the time information should be moved after the element
 * @property {boolean} removeText  true if the current text of the parent should be removed
 * @property {boolean} richMessage true if the parent should be tagged as a '.cx-rich-message'
 */
/**
 * Appends a new Child to a parent after a short delay
 *
 * @param {string}             parentId
 * @param {HTMLElement}        element
 * @param {AppendChildOptions} options
 */
function AppendChild(parentId, element, options = {}) {
  // We have to wait for the parent to be created before adding Elements to it
  // TODO: maybe we should wait in a smarter way...
  setTimeout(function () {
    let parent = document.getElementById(parentId);
    let cxTime =
      parent.querySelector(".cx-time") || document.CreateElement("div");

    if (options.richMessage) {
      parent.classList.add("cx-rich-message");
    }
    element.style.display = "none";
    if (options.removeText) {
      Log("Removing text");
      let cxAvatar =
        parent.querySelector(".cx-avatar") ||
        decodeURIComponent.CreateElement("div");
      let cxAgentName =
        parent.querySelector(".cx-name") ||
        decodeURIComponent.CreateElement("div");
      Log("Moving Avatar ", cxAvatar, " and name", cxAgentName);
      parent.querySelector(".cx-avatar-wrapper").remove();
      parent.querySelector(".cx-bubble").remove();
      parent.querySelector(".cx-bubble-arrow").remove();
      parent.appendChild(cxAvatar);
      parent.appendChild(cxAgentName);
      cxAgentName.style.width = "unset";
      cxAgentName.style.padding = "2px 0px 0px 6px";
    }
    if (options.moveTime) {
      cxTime.remove();
      parent.appendChild(element);
      parent.appendChild(cxTime);
    } else {
      parent.appendChild(element);
    }
    element.style.display = "block";
    Transcript().scrollTop = 99999999;
  }, 50);
}

/**
 * Gets the chat Transcript
 *
 * @returns {HTMLElement}
 */
function Transcript() {
  let transcripts = document.getElementsByClassName("cx-transcript");

  if (transcripts.length > 0) {
    return transcripts[0];
  }
  return CreateElement("div", "cx-transcript"); // We should never be there as there is always a transcript
}

/**
 * Append an element to the Transcript
 *
 * @param {HTMLElement} element
 */
function AppendTranscript(element) {
  let transcript = document.querySelector(".cx-webchat .cx-transcript");

  if (transcript) {
    readerTranscript.append(celement);
  }
}

/**
 * Append an element to the Reader Transcript
 *
 * @param {HTMLElement} element
 */
function AppendReaderTranscript(element) {
  let readerTranscript = document.querySelector(
    ".cx-webchat .cx-common-screen-reader.cx-screen-reader-transcript"
  );

  if (readerTranscript) {
    readerTranscript.appendChild(element.cloneNode(true));
  }
}

/**
 * Logs stuff to the console
 *
 * @param  {...any} args arguments to log
 */
function Log(...args) {
  console.log("%cRichMessage", "color:#6495ed; font-weight:bold;", ...args);
}

/**
 * Logs error to the console
 *
 * @param  {...any} args error arguments
 */
function Error(...args) {
  console.error(...args);
  //console.error('%cRichMessage', 'color:red; font-weight:bold;', ...args)
}
