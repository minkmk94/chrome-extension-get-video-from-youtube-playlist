chrome.browserAction.onClicked.addListener(function () {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    let url = new URL(tabs[0].url);
    if (url.hostname.indexOf('youtube.com') != -1 && url.searchParams.get("list")) {
      createNewtab(tabs[0].url)
    } else {
      alert('Vui lòng chuyển sang tab đang mở playlist.')
    }
  });
});

function createNewtab(url) {
  const API_KEY = 'AIzaSyBBaM2xhaCqy83JX1cmNKHuNOrq82_4EFI';
  const error = {
    error: 'Lỗi, hãy thử lại sau'
  }
  var targetId = null;
  chrome.tabs.onUpdated.addListener(async function listener(tabId, changedProps) {
    if (tabId != targetId || changedProps.status != "complete") {
      return;
    }

    async function fetchData() {
      let validUrl = new URL(url);
      let playlistId = validUrl.searchParams.get("list");
      let items = [];

      let fetchFunc = async function (pageToken = null) {
        let fetchUrl = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
        let params = {
          part: 'snippet',
          key: API_KEY,
          playlistId,
          maxResults: 50,
          ...(pageToken && { pageToken }),
        };
        Object.keys(params).forEach(key => fetchUrl.searchParams.append(key, params[key]));
        let response = await fetch(fetchUrl);
        if (!response.ok) {
          return error;
        }
        let data = await Promise.resolve(response.json());
        items.push(...data.items);

        return data;
      }

      let data = await fetchFunc();
      if (data.error) {
        return error;
      }
      let { nextPageToken } = data || {}
      while (nextPageToken) {
        let tempResults = await fetchFunc(nextPageToken);
        nextPageToken = tempResults.nextPageToken;
      }
      if (items.length) {
        let results = {
          data: items.map(item => {
            let thumbnail = typeof (item.snippet.thumbnails) !== 'undefined' &&
              item.snippet.thumbnails.standard ? item.snippet.thumbnails.standard.url : '';
            return {
              title: item.snippet.title.replace(/["“]/g, ''),
              channelTitle: item.snippet.channelTitle,
              videoId: item.snippet.resourceId.videoId,
              url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
              thumbnail: thumbnail,
            };
          }),
        }

        return results;
      }
    }

    async function getListChannel(videoIds) {
      let fetchUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
      let params = {
        part: 'snippet',
        key: API_KEY,
        id: _.join(videoIds, ','),
        maxResults: 50,
      };
      Object.keys(params).forEach(key => fetchUrl.searchParams.append(key, params[key]));
      let response = await fetch(fetchUrl);
      let data = await Promise.resolve(response.json());

      if (data) {
        return _.map(data.items, item => item.snippet.channelTitle);
      }
    }

    let playlistData = await fetchData();
    if (playlistData.error) {
      chrome.runtime.sendMessage({ error: error });
      return;
    } else {
      let videoIds = _.chunk(_.map(playlistData.data, 'videoId'), 50);
      let channelNames = [];
      for (let _videoIds of videoIds) {
        let _channelNames = await getListChannel(_videoIds);
        channelNames.push(..._channelNames)
      }

      if (playlistData.data.length == channelNames.length) {
        playlistData.data.forEach((item, index) => {
          item.channelTitle = channelNames[index];
        });
      }

      chrome.runtime.sendMessage({ data: playlistData });
    }

  });

  chrome.tabs.create({ url: chrome.runtime.getURL("data.html") }, function (tab) {
    targetId = tab.id;
  });
}
