if (!window._gt) window._gt = [];
if (!window._genesys) window._genesys = {};
if (!window._genesys.extensions) window._genesys.extensions = {};
if (!window._genesys.widgets) window._genesys.widgets = {};

window._genesys.widgets.main = {
  debug: true, // TODO: Do NOT forget to turn this off in production
  theme: "light",
  lang: "ja",
  i18n: "https://apps.mypurecloud.jp/widgets/9.0/i18n/widgets-ja.i18n.json",
  customStylesheetID: "genesys_widgets_custom",
};

window._genesys.widgets.webchat = {
  markdown: true, // We REALLY want this!!
  emojis: true, // So we can send emojis
  charCountEnabled: true, // And that is just nice to have
  debug: true,
  chatButton: {
    enabled: true,
    effect: "fade",
    effectDuration: 500,
  },
  transport: {
    type: "purecloud-v2-sockets",
    dataURL: "https://api.mypurecloud.jp", // TODO: Set this to your PureCloud Region
    orgGuid: "f08a0fa3-c061-4634-9b86-9ed63fcf486f", // TODO: Set this to ypur PureCloud Organization ID
    clientId: "b8b054a6-0660-4a00-a695-f3d05ca19faf", // TODO: Set this to your PureCloud Client ID
    deploymentKey: "acac8101-0df2-4f04-ab15-9bc870db106c", // TODO: Set this to your PureCloud Deployment Key
    redirectUrl: "https://www.demo.apac.inin.com/agent-chat-uploader", // TODO: Set this to your agent chat uploader page
    interactionData: {
      routing: {
        targetType: "QUEUE",
        targetAddress: "100_WebChat", // TODO: Set this to te Queue handling webchats
      },
    },
  },
};

window._genesys.widgets.uploader = {
  upload: async function (data) {
    const key = "703f92268237fd51bb21";
    const storage = `https://www.demo.apac.inin.com/storage/api/v1/files?key=${key}`;
    let formData = new FormData();

    formData.append("file", data);

    let res = await fetch(storage, {
      method: "POST",
      body: formData,
    });
    console.log("Response: ", res);

    if (res.ok) {
      let body = await res.json();
      console.log("Response Body: ", body);
      return body;
    } else {
      throw new { status: res.status, error: res.statusText }();
    }
  },
};
