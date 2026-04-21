'use strict';

let waitingForData = false;
let autoplayGfycat = false;
let sortBy = "new"
let lastId = null;

let autocompleteBlock;
let isLoadingDiv;
let loadMore;
let selectedSubreddit = "";

let globalSignal; // abort prev autocomplete requests

let viewport;

document.addEventListener('DOMContentLoaded', function() { 
  const searchInput = document.getElementById("search");
  viewport = document.getElementsByClassName("viewport")[0];
  autocompleteBlock = document.getElementsByClassName("autocomplete")[0];
  let sortButtons  = document.getElementsByClassName("sort");
  let autoplayToggler = document.getElementsByClassName("nav__autoplay")[0];
  let navbar = document.getElementsByClassName("nav-panel")[0];
  loadMore = document.getElementById("loadMore");
  isLoadingDiv = document.getElementsByClassName("loading-marker")[0];
  // For hide-menu
  let prevScrollpos = window.pageYOffset;
  let currentScrollPos;

  isLoadingDiv.style.display = "none";

  autoplayToggler.addEventListener('click', e => {
    e.preventDefault();
    autoplayGfycat = autoplayGfycat ? false : true;
    autoplayToggler.innerHTML = autoplayGfycat ? "Disable autoplay" : "Enable autoplay"
  });

  autocompleteBlock.addEventListener('click', e => {
    if (e.target && e.target.className == "autocomplete__item") {
      selectedSubreddit = e.target.dataset.subr;
      
      autocompleteBlock.style.display = "none";
      viewport.innerHTML = "";
      searchInput.value = selectedSubreddit;
      navbar.style.backgroundImage = 'url("' + e.target.dataset.banner + '")';
      lastId = "start";
      makeRequest();
    } 
  });

  viewport.addEventListener('click', e => {
    autocompleteBlock.style.display = "none";

    // replace preview with actual content
    if (e.target && e.target.parentElement.className == "viewport__post__overlay") {
      const preview = e.target.parentElement.parentElement
      loadVideo(preview, stringToHTML(decodeURI(preview.dataset.iframe)).firstChild, preview.dataset.fallbackvideo)
    }
  });

  loadMore.addEventListener('click', e => {
    e.preventDefault();
    if (waitingForData) makeRequest();
  });

  [...sortButtons].forEach(elem => {
    elem.addEventListener('click', (e) => {
      e.preventDefault();
      sortBy = e.target.innerHTML;
      resetSortStatus(e.target)

      // reset
      viewport.innerHTML = "";
      lastId = "start";
      makeRequest();
    });
  })

  const resetSortStatus = (e) => {
    [...sortButtons].forEach(elem => elem.classList.remove('active'));
    e.classList.add("active");
  }

  const setWaitingForData = (state) => {
    waitingForData = state;
    isLoadingDiv.style.display = state ? "none" : "block"
  }

  const makeRequest = () => {
    callAPI(selectedSubreddit, lastId)
    .then((data) => {
      let result = applyPosts(data, viewport);
      result ? setWaitingForData(true) : makeRequest()
    })
    .catch( error => console.log(error) );
  }

  searchInput.onfocus = () => {
    autocompleteBlock.style.display = "block";
    searchInput.value = "";
    autoComplete(searchInput.value);
  }

  searchInput.oninput = () => {
    autoComplete(searchInput.value);
  }

  window.onscroll = function(ev) {
    // hide menu
    currentScrollPos = window.pageYOffset;
    if (prevScrollpos > currentScrollPos) {
      navbar.style.top = "0px";
    } else {
      navbar.style.top = "-62px";
    }
    prevScrollpos = currentScrollPos;

    // load content
    if (!waitingForData) return false;
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight && waitingForData) {
      setWaitingForData(false)
      makeRequest();
    }
  };
});

const isImg = function isImg(item) {
  if (item.endsWith('.png') || item.endsWith('.jpg') ||  item.endsWith('.jpeg') || item.endsWith('.gif')) {
    return true;
  }
  return false;
}

const isGif = function(item) {
  return item.endsWith(".gif");
}

const isEmbed = (item) => {
  if (item.match(/youtube\.com\//) || item.match(/twitter\.com\//)) {
    return true;
  }
  return false;
}

const isGfycat = (item) => {
  if (item.match(/gfycat|redgifs/)) {
    return true;
  }
  return false;
}

const isGallery = (item) => {
  console.log(item);
  return item.isGallery;
} 

//iframe text to real iframe
// if text with &gt;&lt
const htmlDecode = (input) => {
  let e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes[0].nodeValue;
}

// if text without &gt;&lt
const stringToHTML = function (str) {
	let parser = new DOMParser();
	let doc = parser.parseFromString(str, 'text/html');
	return doc.body;
};

const applyPosts = (data, viewport) => {
  let posts = data.data.children;
  let hasResult = false;
  lastId = data.data.after

  if (!lastId) {
    // lastId = data.data.children[data.data.children.length - 1].data.name
    hasResult = true;
  }
        
  for(let i = 0; i < posts.length; i++){
    hasResult = renderPost(posts[i].data);
  }
  return hasResult;
}

const renderPost = (postData, postTitle = "", postUrl = "") => {
  let hasResult = false;
  let post = {};

  post.imgSrc = postData.url;
  post.title = postData.title;
  post.perma = postData.permalink;
  post.media = postData.media;
  post.parent = postData.crosspost_parent_list && postData.crosspost_parent_list[0]
  post.previewImgSrc = postData.preview?.images?.at(0)?.resolutions?.at(-1)?.url;
  post.previewVideoSrc = postData.preview?.reddit_video_preview?.fallback_url;

  // Gallery fields
  post.mediaMetadata = postData.media_metadata;
  post.isGallery = postData.is_gallery;

  post.childTitle = postTitle && postUrl ? "<a href='https://reddit.com" + postUrl + "' target='blank' class=" + 'post-title' + ">" + postTitle + "</a> < " : ""

  if (post.parent) {
    renderPost(post.parent, post.title, post.perma)

  } else if(isImg(post.imgSrc)) {
    hasResult = true;
    let imagePost = document.createElement("div");
    imagePost.className = "viewport__post";
    if (isGif(post.imgSrc)) {
      imagePost.innerHTML = "<a href='https://reddit.com" + post.perma + "' target='blank' class=" + 'post-title' + ">" + post.title + "</a><a href=" + post.imgSrc + " target='blank'><img src=" + post.imgSrc + ">"
    } else {
      imagePost.innerHTML = "<a href='https://reddit.com" + post.perma + "' target='blank' class=" + 'post-title' + ">" + post.title + "</a><a href=" + post.imgSrc + " target='blank'><img src=" + post.previewImgSrc + " loading='lazy'>"
    }

    viewport.append(imagePost)

  } else if(isGfycat(post.imgSrc) && post.media) {
    hasResult = true;
    let preview = postData.preview ? postData.preview.images[0].source.url : post.media.oembed.thumbnail_url
    let imagePost = document.createElement("div");

    imagePost.className = "viewport__post";

    if (autoplayGfycat) {
      imagePost.innerHTML = post.childTitle + "<a href='https://reddit.com" + post.perma + "' target='blank' class=" + 'post-title' + ">" + post.title + "</a>" + loadVideo('',post.media.oembed.html, post.previewVideoSrc);
    } else {
      imagePost.innerHTML = post.childTitle + "<a href='https://reddit.com" + post.perma + "' target='blank' class=" + 'post-title' + ">" + post.title + "</a>" +
      "<div class='viewport__post__preview' data-iframe=" + encodeURI(post.media.oembed.html) + " data-fallbackvideo="+ post.previewVideoSrc +"><div class='viewport__post__overlay'><div>PLAY</div></div>" + "<img src=" + preview + "></div>"
    }

    viewport.append(imagePost)

  } else if(isEmbed(post.imgSrc) && post.media) {
    hasResult = true;

    let imagePost = document.createElement("div");
    imagePost.className = "viewport__post";
    imagePost.innerHTML = post.childTitle + "<a href='https://reddit.com" + post.perma + "' target='blank' class=" + 'post-title' + ">" + post.title + "</a><div class='iframe-container'>" + htmlDecode(post.media.oembed.html) + "</div>";
    viewport.append(imagePost)
    // Gallery
  } else if(isGallery(post)) {
    try {
      const mediaArray = Object.values(post.mediaMetadata).map((mediaItem) => {
        if (mediaItem.e === 'Image') {
          return mediaItem.p?.at(-1)?.u;
        }
      })

      hasResult = true;

      const imagGalleryPost = document.createElement("div");
      imagGalleryPost.className = "viewport__post";
      imagGalleryPost.innerHTML = "<a href='https://reddit.com" + post.perma + "' target='blank' class=" + 'post-title' + ">" + post.title + "</a>";

      const resultDiv = makeSliderDiv(mediaArray);
      imagGalleryPost.appendChild(resultDiv);
      viewport.append(imagGalleryPost);

    } catch (e) {
      console.log('GalleryError', e);
    }

    
  }

  return hasResult;
}

const callAPI = async (subreddit, after) => {
  if (!subreddit) throw "empty subreddit";
  if (!after) { 
    isLoadingDiv.style.display = 'none';
    loadMore.style.display = 'none';
    throw "that's all folks!";
  }

  let sort = sortBy
  let theUrl = 'https://www.reddit.com'+ subreddit + sort +'/.json?limit=10&t=all'
  if (after != 'start') {
    theUrl += "&after=" + after;
  }

  let response = await fetch(theUrl, {
    method:'GET',
    cache: 'no-cache',
    // headers:{
    //     'Accept':'application/json',
    //     'Content-Type':'application/json',
    // }
  })
  let data = await response.json();
  return data
}

//////

const subbreditSearch = async (q, signal) => {
  if (!q) throw "empty input";
  let url = "https://www.reddit.com/api/subreddit_autocomplete_v2.json?query=" + q + "&raw_json=1&gilding_detail=1&include_over_18=1&include_profiles=0&limit=10"
  
  let response = await fetch(url, {
    method: 'GET',
    cache: 'no-cache',
    signal: signal,
  })
  let data = await response.json();
  return data
}

const autoComplete = (q) => {
  globalSignal instanceof AbortController && globalSignal.abort();

  const controller = new AbortController();
  globalSignal = controller.signal

  subbreditSearch(q, globalSignal).then(data => {
    autocompleteBlock.innerHTML = "";

    let autocompleteResult = []
    data.data.children.forEach(item => {
      let icon = item.data.icon_img || item.data.community_icon
      icon = icon ? "<img src=" + icon + " class='autocomplete__img' >" : ""
      autocompleteResult.push("<div class='autocomplete__item' data-subr=" + item.data.url + " data-banner=" + item.data.banner_background_image + ">" + icon + item.data.url + "</div>")
    })
    autocompleteBlock.innerHTML = autocompleteResult.join(" ");
  }).catch(data => console.log(data));
}

const makeSliderDiv = (mediaArray) => {
  const imagGalleryBlock = document.createElement("div");
  imagGalleryBlock.className = "slider"
  const slidesHTML = mediaArray.map(item => 
    `<div class="slide"><img src="${item}" loading='lazy'></div>`
  ).join('');
  imagGalleryBlock.insertAdjacentHTML('beforeend', slidesHTML);
  return imagGalleryBlock;
}

const loadVideo = (container, iframeElement, fallbackUrl) => {
  container.childNodes[0].childNodes[0].innerHTML = '';

  const iframeContainer = document.createElement("div");
  iframeContainer.className = "iframe-container";
  iframeContainer.appendChild(iframeElement);
  hideVisibility(iframeContainer, true);
  // container.replaceWith(iframeContainer);
  container.appendChild(iframeContainer);
  
  const timeout = setTimeout(() => {
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.preload = 'metadata';
    video.loading = 'lazy';
    video.style.width = '100%';
    video.innerHTML = `<source src="${fallbackUrl}" type='video/mp4'>`;
    container.replaceWith(video);
  }, 3000);
  
  iframeElement.onload = () => {
    clearTimeout(timeout);
    container.replaceWith(iframeContainer);
    hideVisibility(iframeContainer, false);

};
  iframeElement.onerror = () => {
    clearTimeout(timeout);
    const video = document.createElement('video');
    video.controls = true;
    video.autoplay = true;
    video.preload = 'metadata';
    video.loading = 'lazy';
    video.style.width = '100%';
    video.innerHTML = `<source src="${fallbackUrl}" type='video/mp4'>`;
    iframeContainer.replaceWith(video);
  };
};

const hideVisibility = (element, visibilityState) => {
  if (visibilityState) {
    element.style.visibility = 'hidden';
    element.style.position = 'absolute';
    element.style.top = '-9999px';
    element.style.left = '-9999px';
  } else {
    element.style.removeProperty("visibility")
    element.style.removeProperty("position")
    element.style.removeProperty("top");
    element.style.removeProperty("left");
  }
}