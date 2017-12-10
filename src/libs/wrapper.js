var utils = require('./utils.js')
var settings = require('../settings.js')
var tumblr = require('./tumblr')
tumblr.request(require('request'))

var client = tumblr.createClient({
	consumer_key: settings.consumerKey,
	consumer_secret: settings.consumerSecret,
	token: settings.token,
	token_secret: settings.tokenSecret
})

var followers = []
var reblogKeyArray = []
var lastDate = 0
var id = 0
var reblogKey = 0
var imageUrl = ''
var postTags = ''
var url = ''
var tags = ''
var before = 0
var likeCount = 0
var currentAction = 0

module.exports = {
	
	init: function() {
		settings.noteLimit = utils.randomInt(20, 900)
		tags = settings.tagsArray[utils.randomInt(0, settings.tagsArray.length)]
	},

	clear: function() {
		lastDate = 0
		reblogKeyArray = []
	},

	reset: function() {
		imageUrl = ''
		postTags = ''
		currentAction = 0
		id = 0
		likeCount = 0
	},
	
	getTags: function() {
		return tags
	},
	
	getFollowersLength: function() {
		return followers.length
	},

	getFollowers: function (offset) {
		client.following(offset, function (err, data) {
			if (err) {
				console.log('|ERROR| client.following:', err, data)
			} else {
				data.blogs.forEach(function (blog) {
					followers.push(blog.name)
				})
				if (data.total_blogs > offset+data.blogs.length) {
					module.exports.getFollowers(offset+followers.length)
				}
			}
		})
	},

	doHarvest: function (callback) {
		if (id != 0) {
			var random = utils.randomInt(0,10)
			if (random < 9 && followers.indexOf(url) == -1) {
				module.exports.followUser(url)
			}
			if (random < 3) {
				if (utils.randomInt(0,10) < 10 && imageUrl != '' && postTags != '') {
					module.exports.postPhoto(settings.blogName, imageUrl, postTags)
				} else {
					module.exports.reblog(settings.blogName, id, reblogKey)
				}
			}
		} else {
			const postType = settings.postTypes[utils.randomInt(0, settings.postTypes.length)]
			module.exports.getTaggedPosts(tags, settings.limit, lastDate, settings.noteLimit, postType, callback)

			return
		}

		currentAction++
		if (currentAction < settings.maxActionPerMinute) {
			module.exports.doHarvest(callback)
		} else if (callback) {
			setTimeout(function () {
				callback()
			}, 10000)
		}
	},

	getTaggedPosts: function (tags, limit, before, noteLimit, postType, callback) {
		var params = { limit: limit }
		if (before != 0) {
			params = { before: before, limit: limit }
		}
		client.tagged(tags, params, function (err, data) {
			if (err) {
				console.log('|ERROR| client.tagged:', err, data)
			} else if (data != null && data.length > 0) {
				data.forEach(function (post) {
					lastDate = post.timestamp
					if (post.note_count > noteLimit && reblogKeyArray.indexOf(post.reblog_key) == -1 && post.type == postType) {
						id = post.id
						reblogKey = post.reblog_key
						url = 'http://'+post.blog_name+'.tumblr.com'
						postTags = ''
						post.tags.forEach(function (tag) {
							postTags += tag +','
						})
						if (post.type == 'photo') {
							imageUrl = post.photos[0].alt_sizes[0].url
						}
						if (utils.randomInt(0, 2) == 1) {
							return
						}
					}
					if (post.note_count < 5 && utils.randomInt(0, 60) == 1 && likeCount < settings.maxLikeCount) {
						module.exports.likePost(post.id, post.reblog_key)
						likeCount++
					}
				})
				module.exports.doHarvest(callback)
			}
		})
	},

	likePost: function (id, reblogKey) {
		console.log('Like post id:', id, 'reblogKey:', reblogKey)
		client.like(id, reblogKey, function (err, data) {
			if (err) {
				console.log('|ERROR| client.like:', err, data)
			}
		})
	},

	followUser: function (url) {
		console.log('Follow blog:', url)
		client.follow(url, function (err, data) {
			if (err) {
				console.log('|ERROR| client.follow:', err, data)
			} else {
				followers.push(url)
			}
		})
	},

	postPhoto: function (blogName, imgUrl, tags) {
		console.log("Post image:", imgUrl, 'with tags:', tags)
		client.photo(blogName, { source: imgUrl, tags: tags }, function (err, data) {
			if (err) {
				console.log('|ERROR| client.photo:', err, data)
			} else {
				reblogKeyArray.push(reblogKey)
			}
		})
	},

	reblog: function (blogName, id, reblogKey) {
		console.log('Reblog id:', id, 'reblogKey:', reblogKey)
		var params = { id: id, reblogKey: reblogKey }
		if (utils.randomInt(0, 10) == 1) {
			var randomComment = settings.commentsArray[utils.randomInt(0, settings.commentsArray.length)]
			params = { id: id, reblogKey: reblogKey, comment: randomComment }
		}
		client.reblog(blogName, params, function (err, data) {
			if (err) {
				console.log('|ERROR| client.reblog:', err, data)
			} else {
				reblogKeyArray.push(reblogKey)
			}
		})
	}
}