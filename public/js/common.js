// Globals
var cropper;
var timer;
var selectedUsers = [];

$(document).ready(() => {
  refreshMessagesBadge();
  refreshNotificationsBadge();
});

$("#postTextarea, #replyTextarea").keyup((event) => {
  var textbox = $(event.target);
  var value = textbox.val().trim();

  var isModal = textbox.parents(".modal").length == 1;

  var submitButton = isModal ? $("#submitReplyButton") : $("#submitPostButton");

  if (submitButton.length == 0) return alert("No submit button found");

  if (value == "") {
    submitButton.prop("disabled", true);
    return;
  }

  submitButton.prop("disabled", false);
});

$("#submitPostButton, #submitReplyButton").click(() => {
  var button = $(event.target);

  var isModal = button.parents(".modal").length == 1;
  var textbox = isModal ? $("#replyTextarea") : $("#postTextarea");

  var data = {
    content: textbox.val(),
  };

  if (isModal) {
    var id = button.data().id;
    if (id == null) return alert("Button id is null");
    data.replyTo = id;
  }

  $.post("/api/posts", data, (postData) => {
    if (postData.replyTo) {
      location.reload();
    } else {
      var html = createPostHtml(postData);
      $(".postsContainer").prepend(html);
      textbox.val("");
      button.prop("disabled", true);
    }
  });
});
// post reply logic

$("#replyModal").on("show.bs.modal", (event) => {
  var button = $(event.relatedTarget);
  var postId = getPostIdFromElement(button);
  $("#submitReplyButton").data("id", postId);

  $.get("/api/posts/" + postId, (results) => {
    outputPosts(results.postData, $("#originalPostContainer"));
  });
});
// clearing the original post Container when the reply box is closed

$("#replyModal").on("hidden.bs.modal", () =>
  $("#originalPostContainer").html("")
);
// delete post attaching the post id to delete button

$("#deletePostModal").on("show.bs.modal", (event) => {
  var button = $(event.relatedTarget);
  var postId = getPostIdFromElement(button);
  $("#deletePostButton").data("id", postId);
});

$("#confirmPinModal").on("show.bs.modal", (event) => {
  var button = $(event.relatedTarget);
  var postId = getPostIdFromElement(button);
  $("#pinPostButton").data("id", postId);
});

$("#unpinModal").on("show.bs.modal", (event) => {
  var button = $(event.relatedTarget);
  var postId = getPostIdFromElement(button);
  $("#unpinPostButton").data("id", postId);
});

// post is delete from the db onclick of delete button

$("#deletePostButton").click((event) => {
  var postId = $(event.target).data("id");

  $.ajax({
    url: `/api/posts/${postId}`,
    type: "DELETE",
    success: (data, status, xhr) => {
      if (xhr.status != 202) {
        alert("could not delete post");
        return;
      }

      location.reload();
    },
  });
});

$("#pinPostButton").click((event) => {
  var postId = $(event.target).data("id");

  $.ajax({
    url: `/api/posts/${postId}`,
    type: "PUT",
    data: { pinned: true },
    success: (data, status, xhr) => {
      if (xhr.status != 204) {
        alert("could not delete post");
        return;
      }

      location.reload();
    },
  });
});

$("#unpinPostButton").click((event) => {
  var postId = $(event.target).data("id");

  $.ajax({
    url: `/api/posts/${postId}`,
    type: "PUT",
    data: { pinned: false },
    success: (data, status, xhr) => {
      if (xhr.status != 204) {
        alert("could not delete post");
        return;
      }

      location.reload();
    },
  });
});

$("#filePhoto").change(function () {
  if (this.files && this.files[0]) {
    var reader = new FileReader();
    reader.onload = (e) => {
      var image = document.getElementById("imagePreview");
      image.src = e.target.result;

      if (cropper !== undefined) {
        cropper.destroy();
      }

      cropper = new Cropper(image, {
        aspectRatio: 1 / 1,
        background: false,
      });
    };
    reader.readAsDataURL(this.files[0]);
  } else {
    console.log("nope");
  }
});

$("#coverPhoto").change(function () {
  if (this.files && this.files[0]) {
    var reader = new FileReader();
    reader.onload = (e) => {
      var image = document.getElementById("coverPreview");
      image.src = e.target.result;

      if (cropper !== undefined) {
        cropper.destroy();
      }

      cropper = new Cropper(image, {
        aspectRatio: 16 / 9,
        background: false,
      });
    };
    reader.readAsDataURL(this.files[0]);
  }
});

$("#imageUploadButton").click(() => {
  var canvas = cropper.getCroppedCanvas();

  if (canvas == null) {
    alert("Could not upload image. Make sure it is an image file.");
    return;
  }

  canvas.toBlob((blob) => {
    var formData = new FormData();
    formData.append("croppedImage", blob);

    $.ajax({
      url: "/api/users/profilePicture",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: () => location.reload(),
    });
  });
});

$("#coverPhotoButton").click(() => {
  var canvas = cropper.getCroppedCanvas();

  if (canvas == null) {
    alert("Could not upload image. Make sure it is an image file.");
    return;
  }

  canvas.toBlob((blob) => {
    var formData = new FormData();
    formData.append("croppedImage", blob);

    $.ajax({
      url: "/api/users/coverPhoto",
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: () => location.reload(),
    });
  });
});

$("#userSearchTextbox").keydown((event) => {
  clearTimeout(timer);
  var textbox = $(event.target);
  var value = textbox.val();

  if (value == "" && (event.which == 8 || event.keyCode == 8)) {
    // remove user from selection
    selectedUsers.pop();
    updateSelectedUsersHtml();
    $(".resultsContainer").html("");

    if (selectedUsers.length == 0) {
      $("#createChatButton").prop("disabled", true);
    }

    return;
  }

  timer = setTimeout(() => {
    value = textbox.val().trim();

    if (value == "") {
      $(".resultsContainer").html("");
    } else {
      searchUsers(value);
    }
  }, 1000);
});

$("#createChatButton").click(() => {
  var data = JSON.stringify(selectedUsers);

  $.post("/api/chats", { users: data }, (chat) => {
    if (!chat || !chat._id) return alert("Invalid response from server.");

    window.location.href = `/messages/${chat._id}`;
  });
});

// like button logic

$(document).on("click", ".likeButton", (event) => {
  var button = $(event.target);
  var postId = getPostIdFromElement(button);

  if (postId === undefined) return;

  $.ajax({
    url: `/api/posts/${postId}/like`,
    type: "PUT",
    success: (postData) => {
      button.find("span").text(postData.likes.length || "");

      if (postData.likes.includes(userLoggedIn._id)) {
        button.addClass("active");
      } else {
        button.removeClass("active");
      }
    },
  });
});

// retweetbutton logic

$(document).on("click", ".retweetButton", (event) => {
  var button = $(event.target);
  var postId = getPostIdFromElement(button);

  if (postId === undefined) return;

  $.ajax({
    url: `/api/posts/${postId}/retweet`,
    type: "POST",
    success: (postData) => {
      button.find("span").text(postData.retweetUsers.length || "");

      if (postData.retweetUsers.includes(userLoggedIn._id)) {
        button.addClass("active");
      } else {
        button.removeClass("active");
      }
    },
  });
});

// click on post to open the postpage

$(document).on("click", ".post", (event) => {
  var element = $(event.target);
  var postId = getPostIdFromElement(element);

  if (postId !== undefined && !element.is("button")) {
    window.location.href = "/posts/" + postId;
  }
  // !element.is("button")
  // what this line does is it donot allow user to direct to post page on clicking the buttons ass the condition is made to not do so
});

$(document).on("click", ".followButton", (e) => {
  var button = $(e.target);
  var userId = button.data().user;

  $.ajax({
    url: `/api/users/${userId}/follow`,
    type: "PUT",
    success: (data, status, xhr) => {
      if (xhr.status == 404) {
        alert("user not found");
        return;
      }

      var difference = 1;
      if (data.following && data.following.includes(userId)) {
        button.addClass("following");
        button.text("Following");
      } else {
        button.removeClass("following");
        button.text("Follow");
        difference = -1;
      }

      var followersLabel = $("#followersValue");
      if (followersLabel.length != 0) {
        var followersText = followersLabel.text();
        followersText = parseInt(followersText);
        followersLabel.text(followersText + difference);
      }
    },
  });
});

$(document).on("click", ".notification.active", (e) => {
  var container = $(e.target);
  var notificationId = container.data().id;

  var href = container.attr("href");
  e.preventDefault();

  var callback = () => (window.location = href);
  markNotificationsAsOpened(notificationId, callback);
});

// as content is loaded dynamically which is noy yet on page so this below function wont work
// $(".likeButton").click(()=>{
// alert("likeButton")});

function getPostIdFromElement(element) {
  var isRoot = element.hasClass("post");
  var rootElement = isRoot == true ? element : element.closest(".post");
  var postId = rootElement.data().id;

  if (postId === undefined) return alert("Post id undefined");

  return postId;
}

function createPostHtml(postData, largeFont = false) {
  if (postData == null) return alert("post object is null");

  var isRetweet = postData.retweetData !== undefined;
  var retweetedBy = isRetweet ? postData.postedBy.username : null;
  postData = isRetweet ? postData.retweetData : postData;

  var postedBy = postData.postedBy;

  if (postedBy._id === undefined) {
    return console.log("User object not populated");
  }

  var displayName = postedBy.firstName + " " + postedBy.lastName;
  var timestamp = timeDifference(new Date(), new Date(postData.createdAt));

  var likeButtonActiveClass = postData.likes.includes(userLoggedIn._id)
    ? "active"
    : "";
  var retweetButtonActiveClass = postData.retweetUsers.includes(
    userLoggedIn._id
  )
    ? "active"
    : "";
  var largeFontClass = largeFont ? "largeFont" : "";

  var retweetText = "";
  if (isRetweet) {
    retweetText = `<span>
                        <i class='fas fa-retweet'></i>
                        Retweeted by <a href='/profile/${retweetedBy}'>@${retweetedBy}</a>    
                    </span>`;
  }

  var replyFlag = "";
  if (postData.replyTo && postData.replyTo._id) {
    if (!postData.replyTo._id) {
      return alert("Reply to is not populated");
    } else if (!postData.replyTo.postedBy._id) {
      return alert("Posted by is not populated");
    }

    var replyToUsername = postData.replyTo.postedBy.username;
    replyFlag = `<div class='replyFlag'>
                        Replying to <a href='/profile/${replyToUsername}'>@${replyToUsername}<a>
                    </div>`;
  }

  var buttons = "";
  var pinnedPostText = "";
  if (postData.postedBy._id == userLoggedIn._id) {
    var pinnedClass = "";
    var dataTarget = "#confirmPinModal";
    if (postData.pinned === true) {
      pinnedClass = "active";
      dataTarget = "#unpinModal";
      pinnedPostText =
        "<i class='fas fa-thumbtack'></i> <span>Pinned post</span>";
    }

    buttons = `<button class='pinButton ${pinnedClass}' data-id="${postData._id}" data-toggle="modal" data-target="${dataTarget}"><i class='fas fa-thumbtack'></i></button>
                    <button data-id="${postData._id}" data-toggle="modal" data-target="#deletePostModal"><i class='fas fa-times'></i></button>`;
  }

  return `<div class='post ${largeFontClass}' data-id='${postData._id}'>
                <div class='postActionContainer'>
                    ${retweetText}
                </div>
                <div class='mainContentContainer'>
                    <div class='userImageContainer'>
                        <img src='${postedBy.profilePic}'>
                    </div>
                    <div class='postContentContainer'>
                        <div class='pinnedPostText'>${pinnedPostText}</div>
                        <div class='header'>
                            <a href='/profile/${
                              postedBy.username
                            }' class='displayName'>${displayName}</a>
                            <span class='username'>@${postedBy.username}</span>
                            <span class='date'>${timestamp}</span>
                            ${buttons}
                        </div>
                        ${replyFlag}
                        <div class='postBody'>
                            <span>${postData.content}</span>
                        </div>
                        <div class='postFooter'>
                            <div class='postButtonContainer'>
                                <button data-toggle='modal' data-target='#replyModal'>
                                    <i class='far fa-comment'></i>
                                </button>
                            </div>
                            <div class='postButtonContainer green'>
                                <button class='retweetButton ${retweetButtonActiveClass}'>
                                    <i class='fas fa-retweet'></i>
                                    <span>${
                                      postData.retweetUsers.length || ""
                                    }</span>
                                </button>
                            </div>
                            <div class='postButtonContainer red'>
                                <button class='likeButton ${likeButtonActiveClass}'>
                                    <i class='far fa-heart'></i>
                                    <span>${postData.likes.length || ""}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;
}

function timeDifference(current, previous) {
  var msPerMinute = 60 * 1000;
  var msPerHour = msPerMinute * 60;
  var msPerDay = msPerHour * 24;
  var msPerMonth = msPerDay * 30;
  var msPerYear = msPerDay * 365;

  var elapsed = current - previous;

  if (elapsed < msPerMinute) {
    if (elapsed / 1000 < 30) return "Just now";

    return Math.round(elapsed / 1000) + " seconds ago";
  } else if (elapsed < msPerHour) {
    return Math.round(elapsed / msPerMinute) + " minutes ago";
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + " hours ago";
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + " days ago";
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + " months ago";
  } else {
    return Math.round(elapsed / msPerYear) + " years ago";
  }
}

function outputPosts(results, container) {
  container.html("");

  if (!Array.isArray(results)) {
    results = [results];
  }

  results.forEach((result) => {
    var html = createPostHtml(result);
    container.append(html);
  });

  if (results.length == 0) {
    container.append("<span class='noResults'>Nothing to show.</span>");
  }
}

function outputPostsWithReplies(results, container) {
  container.html("");

  if (results.replyTo !== undefined && results.replyTo._id !== undefined) {
    var html = createPostHtml(results.replyTo);
    container.append(html);
  }

  var mainPostHtml = createPostHtml(results.postData, true);
  container.append(mainPostHtml);

  results.replies.forEach((result) => {
    var html = createPostHtml(result);
    container.append(html);
  });
}

function outputUsers(results, container) {
  container.html("");

  results.forEach((result) => {
    var html = createUserHtml(result, true);
    container.append(html);
  });

  if (results.length == 0) {
    container.append("<span class='noResults'>No results found</span>");
  }
}

function createUserHtml(userData, showFollowButton) {
  var name = userData.firstName + " " + userData.lastName;
  var isFollowing =
    userLoggedIn.following && userLoggedIn.following.includes(userData._id);
  var text = isFollowing ? "Following" : "Follow";
  var buttonClass = isFollowing ? "followButton following" : "followButton";

  var followButton = "";
  if (showFollowButton && userLoggedIn._id != userData._id) {
    followButton = `<div class='followButtonContainer'>
                            <button class='${buttonClass}' data-user='${userData._id}'>${text}</button>
                        </div>`;
  }

  return `<div class='user'>
                <div class='userImageContainer'>
                    <img src='${userData.profilePic}'>
                </div>
                <div class='userDetailsContainer'>
                    <div class='header'>
                        <a href='/profile/${userData.username}'>${name}</a>
                        <span class='username'>@${userData.username}</span>
                    </div>
                </div>
                ${followButton}
            </div>`;
}

function searchUsers(searchTerm) {
  $.get("/api/users", { search: searchTerm }, (results) => {
    outputSelectableUsers(results, $(".resultsContainer"));
  });
}

function outputSelectableUsers(results, container) {
  container.html("");

  results.forEach((result) => {
    if (
      result._id == userLoggedIn._id ||
      selectedUsers.some((u) => u._id == result._id)
    ) {
      return;
    }

    var html = createUserHtml(result, false);
    var element = $(html);
    element.click(() => userSelected(result));

    container.append(element);
  });

  if (results.length == 0) {
    container.append("<span class='noResults'>No results found</span>");
  }
}

function userSelected(user) {
  selectedUsers.push(user);
  updateSelectedUsersHtml();
  $("#userSearchTextbox").val("").focus();
  $(".resultsContainer").html("");
  $("#createChatButton").prop("disabled", false);
}

function updateSelectedUsersHtml() {
  var elements = [];

  selectedUsers.forEach((user) => {
    var name = user.firstName + " " + user.lastName;
    var userElement = $(`<span class='selectedUser'>${name}</span>`);
    elements.push(userElement);
  });

  $(".selectedUser").remove();
  $("#selectedUsers").prepend(elements);
}

function getChatName(chatData) {
  var chatName = chatData.chatName;

  if (!chatName) {
    var otherChatUsers = getOtherChatUsers(chatData.users);
    var namesArray = otherChatUsers.map(
      (user) => user.firstName + " " + user.lastName
    );
    chatName = namesArray.join(", ");
  }

  return chatName;
}

function getOtherChatUsers(users) {
  if (users.length == 1) return users;

  return users.filter((user) => user._id != userLoggedIn._id);
}

function messageReceived(newMessage) {
  if ($(".chatContainer").length == 0) {
    // Show popup notification
  } else {
    addChatMessageHtml(newMessage);
  }

  refreshMessagesBadge();
}

function markNotificationsAsOpened(notificationId = null, callback = null) {
  if (callback == null) callback = () => location.reload();

  var url =
    notificationId != null
      ? `/api/notifications/${notificationId}/markAsOpened`
      : `/api/notifications/markAsOpened`;
  $.ajax({
    url: url,
    type: "PUT",
    success: () => callback(),
  });
}

function refreshMessagesBadge() {
  $.get("/api/chats", { unreadOnly: true }, (data) => {
    var numResults = data.length;

    if (numResults > 0) {
      $("#messagesBadge").text(numResults).addClass("active");
    } else {
      $("#messagesBadge").text("").removeClass("active");
    }
  });
}

function refreshNotificationsBadge() {
  $.get("/api/notifications", { unreadOnly: true }, (data) => {
    var numResults = data.length;

    if (numResults > 0) {
      $("#notificationBadge").text(numResults).addClass("active");
    } else {
      $("#notificationBadge").text("").removeClass("active");
    }
  });
}
