const DEFAULT_CONFIG = {
  minGroupTabNum: 2
};

const HOST_BLACK_LIST = [
  'newtab'
];

const GROUP_DOMAINS = {};

class GroupDomain {
  constructor(groupId) {
    if (!groupId) {
      throw new TypeError('groupId is required for class GroupDomain');
    }

    this.groupId = groupId;
  }

  equalsByGroupId(groupId) {
    return this.groupId === groupId;
  }
}

chrome.tabGroups.onRemoved.addListener(group => {
  console.debug('tabGroups removed', group);
  let foundKey;

  for (const [key, groupDomain] of Object.entries(GROUP_DOMAINS)) {
    if (groupDomain.equalsByGroupId(group.id)) {
      foundKey = key;
      break;
    }
  }

  if (foundKey) {
    delete GROUP_DOMAINS[foundKey];
  }
});

// 监听tab变更事件
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.debug('tabs updated', tabId, changeInfo, tab);
  const {url} = changeInfo;

  // url has changed
  if (url) {
    const u = new URL(url);
    const hostname = u.hostname;

    if (HOST_BLACK_LIST.includes(hostname)) {
      return;
    }

    const groupId = await chrome.tabs.group({
      tabIds: tabId,
      groupId: GROUP_DOMAINS[hostname] && GROUP_DOMAINS[hostname].groupId
    });
    const tabGroup = await chrome.tabGroups.get(groupId);

    await chrome.windows.update(tabGroup.windowId, {focused: true});
    await chrome.tabs.update(tabId, {active: true});

    // save group id & update group
    if (!GROUP_DOMAINS[hostname]) {
      GROUP_DOMAINS[hostname] = new GroupDomain(groupId);
      await chrome.tabGroups.update(groupId, {
        color: randomProperty(chrome.tabGroups.Color),
        title: getGroupTitleByHostname(hostname)
      });
    }
  }
});

function randomProperty(obj) {
  const keys = Object.keys(obj);
  return obj[keys[keys.length * Math.random() << 0]];
}

function getGroupTitleByHostname(hostname) {
  return hostname.split('.').reverse().splice(0, 2).reverse()[0].slice(0, 2);
}
