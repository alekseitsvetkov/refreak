export default defineBackground(() => {
  console.log('Background script loaded!', { id: browser.runtime.id });

  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id) {
      console.log('Extension icon clicked!', { tabId: tab.id });
    }
  });

  browser.runtime.onInstalled.addListener(async () => {
    console.log('Extension installed/updated!');
  });
});
