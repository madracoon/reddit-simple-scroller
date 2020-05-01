'use strict';

let waitingForData = false;
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
  loadMore = document.getElementById("loadMore");
  isLoadingDiv = document.getElementsByClassName("loading-marker")[0];

  isLoadingDiv.style.display = "none";

  autocompleteBlock.addEventListener('click', e => {
    if (e.target && e.target.className == "autocomplete__item") {
      selectedSubreddit = e.target.dataset.subr;
      
      autocompleteBlock.style.display = "none";
      viewport.innerHTML = "";
      searchInput.value = selectedSubreddit;
      lastId = "start";
      makeRequest();
    } 
  });

  viewport.addEventListener('click', e => {
    autocompleteBlock.style.display = "none";
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
    autoComplete(searchInput.value);
  }

  searchInput.oninput = () => {
    autoComplete(searchInput.value);
  }

  window.onscroll = function(ev) {
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

const isEmbed = (item) => {
  if (item.match(/gfycat/) || item.match(/youtube\.com\//) || item.match(/twitter\.com\//)) {
    return true;
  }
  return false;
}

//iframe text to real iframe
const htmlDecode = (input) => {
  var e = document.createElement('div');
  e.innerHTML = input;
  return e.childNodes[0].nodeValue;
}

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

  post.childTitle = postTitle && postUrl ? "<a href='https://reddit.com" + postUrl + "' target='blank'>" + postTitle + "</a> < " : ""

  if (post.parent) {
    renderPost(post.parent, post.title, post.perma)
  } else if(isImg(post.imgSrc)) {
    hasResult = true;
    let imagePost = document.createElement("div");
    imagePost.className = "viewport__post";
    imagePost.innerHTML = "<a href='https://reddit.com" + post.perma + "' target='blank'>" + post.title + "</a><a href=" + post.imgSrc + " target='blank'><img src=" + post.imgSrc + ">"
    viewport.append(imagePost)
    
  } else if(isEmbed(post.imgSrc) && post.media) {
    hasResult = true;

    let imagePost = document.createElement("div");
    imagePost.className = "viewport__post";
    imagePost.innerHTML = post.childTitle + "<a href='https://reddit.com" + post.perma + "' target='blank'>" + post.title + "</a>" + htmlDecode(post.media.oembed.html);
    viewport.append(imagePost)
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
    // theUrl += "&after=t3_" + after;
    theUrl += "&after=" + after;
  }

  let response = await fetch(theUrl, {
    method:'GET',
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
      autocompleteResult.push("<div class='autocomplete__item' data-subr=" + item.data.url + ">" + icon + item.data.url + "</div>")
    })
    autocompleteBlock.innerHTML = autocompleteResult.join(" ");
  }).catch(data => console.log(data));
}
