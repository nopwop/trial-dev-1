
const wpnopRelatedPosts = (function() {
  const related_tags_max = 3
  const related_categories_max = 3
  const related_max = 9

  function postsByTag(tag_id, per_page) {
    let pp = per_page || 30
    let url = `/wp-json/wp/v2/posts?tags=${tag_id}&per_page=${pp}&_fields=id,link,title,featured_media`
    return fetch(url).then(r => r.json())
  }

  function postsByCategory(category_id, per_page) {
    let pp = per_page || 30
    let url = `/wp-json/wp/v2/posts?categories=${category_id}&per_page=${pp}&_fields=id,link,title,featured_media`
    return fetch(url).then(r => r.json())
  }

  function getCurrentPostId() {
    var el = document.getElementsByTagName('body')
    var classes = el[0].className.split(' ')
    var postid = null
    classes.forEach((i) => {if (i.split('-')[0] == 'postid') postid = i.split('-')[1]})
    return postid
    //return '6951'
  }

  function postById(post_id) {
    let url = `/wp-json/wp/v2/posts/${post_id}?_fields=id,featured_media,title,link,tags,categories`
    return fetch(url).then(r => r.json())
  }

  function mediaById(media_id) {
    let url = `/wp-json/wp/v2/media/${media_id}`
    return fetch(url).then(r => r.json())
  }

  function getTagRelatedPost(post) {
    if (!post.tags || !post.tags.length || post.tags.length < 0) 
      return Promise.resolve([])
    
    let tags = post.tags
    let listOfPost = []
    return new Promise(function(resolve, reject) {
      let promise = Promise.resolve()
      let count = 0
      for (let i=0; (i < tags.length) && (count < related_tags_max); i++) {
        promise = promise.then(data => {
          if (data && data.id != post.id) {
            listOfPost = listOfPost.concat(data)
            count++
          }
          return postsByTag(tags[i], 10)
        })
      }
      promise.then(data => {
        if (data && data.id != post.id && count < related_tags_max) {
          listOfPost = listOfPost.concat(data)
        }
        resolve(listOfPost)
      })
    })
  }

  function getCategoryRelatedPost(post) {
    if (!post.categories || !post.categories.length || post.categories.length < 0) 
      return Promise.resolve([])
    
    let categories = post.categories
    let listOfPost = []
    return new Promise(function(resolve, reject) {
      let promise = Promise.resolve()
      let count = 0
      for (let i=0; (i < categories.length) && (count < related_categories_max); i++) {
        promise = promise.then(data => {
          if (data && data.id != post.id) {
            listOfPost = listOfPost.concat(data)
            count++
          }
          return postsByCategory(categories[i], 10)
        })
      }
      promise.then(data => {
        if (data && data.id != post.id && count < related_categories_max) {
          listOfPost = listOfPost.concat(data)
        }
        resolve(listOfPost)
      })
    })
  }

  function chosePostsFrom(current, listFromCategories, listFromTags) {
    let ret = []
    let count = 0
    ret = ret.concat(
      listFromCategories.filter((i) => {
        return (Math.random() < 0.5) && (current.id != i.id) && (count++ < related_max)
      })
    )
    ret = ret.concat(
      listFromTags.filter((i) => {
        return (Math.random() < 0.5) && (current.id != i.id) && (ret.findIndex((j) => j.id == i.id) == -1) && (count++ < related_max)
      }
    ))
    return ret
  }

  function getRelatedPost(post) {
    let list_from_categories = []
    let list_from_tags = []
    return new Promise(function(resolve, reject) {
      getCategoryRelatedPost(post).then(list => {
        list_from_categories = list
        return getTagRelatedPost(post)
      }).then(list => {
        list_from_tags = list
        resolve(chosePostsFrom(post, list_from_categories, list_from_tags))
      })
    })
  }

  function getMediaForEachPost(listOfPost, callHanlderEach) {
    var list = []
    return new Promise(function(resolve, reject){
      
      let promise = Promise.resolve()
      let post = null
      
      for (let i = 0; i < listOfPost.length; i++) {
        promise = promise.then(media => {
          if (media && post) callHanlderEach(post, media)
          // for next media
          post = listOfPost[i]
          if (!post.featured_media)
            return Promise.resolve()
          else 
            return mediaById(post.featured_media)
        })
      }

      promise.then(media => {
        if (media && post) callHanlderEach(post, media)
        resolve(list)
      })
    })
  }

  function truncate(str, len){
    return str.length <= len ? str: (str.substr(0, len)+"...")
  }

  function render(options, handler) {

    let elmParent = document.getElementById(options.id)
    let html = ''

    function callHandlerPre() {
      if (typeof handler.pre != 'function') return
      let pre = handler.pre.call(handler)
      elmParent.innerHTML = pre
    }

    function callHandlerBegin() {
      if (typeof handler.begin != 'function') return
      html += handler.begin.call(handler)
    }
    
    function callHandlerEnd() {
      if (typeof handler.end != 'function') return
      html += handler.end.call(handler)
      elmParent.innerHTML = html
    }

    function callHanlderEach(post, media) {
      if (typeof handler.each != 'function') return 

      let p = {
        img: 'img',
        thumbnail: media.media_details.sizes.thumbnail.source_url,
        id: post.id,
        link: post.link,
        title: post.title.rendered,
      }
      html += handler.each.call(handler, p)
    }

    callHandlerPre()
    callHandlerBegin()
    postById(getCurrentPostId()).then((data) => {
      return getRelatedPost(data)
    }).then(listOfPost => {
      return getMediaForEachPost(listOfPost, callHanlderEach)
    }).then(() => {
      callHandlerEnd()
    })
  }
  return {
    render: render,
  }
})()
