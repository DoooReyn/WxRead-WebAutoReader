/** @format */

(() => {
  //-----------浏览器通知-----------

  //浏览器发送通知
  function sendNotice(title, content) {
    if (window.Notification && Notification.permission === "granted") {
      var notification = new Notification(title, {
        body: content || ""
      });
      notification.onclick = function() {
        window.focus();
        notification.close();
      };
    }
  }

  //判断浏览器是否支持弹出实例
  function requestPermission() {
    setTimeout(function() {
      if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission(function(status) {
          if (status === "granted") {
            sendNotice("微读自动阅读器", "微读自动阅读器很高兴为您服务");
          } else {
            alert("当前浏览器不支持弹出消息");
          }
        });
      }
    }, 1000);
  }

  //判断浏览器是否支持 Web Notifications API
  if (window.Notification) {
    // 支持
    console.log("微读自动阅读器·您的浏览器支持消息通知");
    requestPermission();
  } else {
    // 不支持
    alert("微读自动阅读器·您的浏览器不支持消息通知，建议您使用Chrome浏览器");
  }

  //-----------wxread-----------

  //模拟发送键盘事件
  function fireKeyEvent(element, evt_type, key_code) {
    var doc = element.ownerDocument,
      win = doc.defaultView || doc.parentWindow,
      event_target;
    if (doc.createEvent) {
      if (win.KeyEvent) {
        event_target = doc.createEvent("KeyEvents");
        event_target.initKeyEvent(evt_type, true, true, win, false, false, false, false, key_code, 0);
      } else {
        event_target = doc.createEvent("UIEvents");
        Object.defineProperty(event_target, "keyCode", {
          get: function() {
            return this.keyCodeVal;
          }
        });
        Object.defineProperty(event_target, "which", {
          get: function() {
            return this.keyCodeVal;
          }
        });
        event_target.initUIEvent(evt_type, true, true, win, 1);
        event_target.keyCodeVal = key_code;
        if (event_target.keyCode !== key_code) {
          console.log("keyCode " + event_target.keyCode + " 和 (" + event_target.which + ") 不匹配");
        }
      }
      element.dispatchEvent(event_target);
    } else if (doc.createEventObject) {
      event_target = doc.createEventObject();
      event_target.keyCode = key_code;
      element.fireEvent("on" + evt_type, event_target);
    }
  }

  //获取元素
  function _getElement(name) {
    return document.getElementsByClassName(name)[0];
  }

  //自动阅读实现
  function wxAutoReader() {
    //定时器句柄
    var _handler;
    //页面滚动时间间隔
    const _page_scroll_interval = 2000;
    //翻页等待时间间隔
    const _page_turn_interval = 3000;
    //每次页面滚动距离
    const _page_scroll_distance = 24;
    //需要用到的元素
    const _app_element_name = "app";
    const _title_element_name = "readerTopBar_title_chapter";
    const _chapter_element_name = "readerTopBar_title_link";
    const _footer_element_name = "readerFooter_button";

    //重新获取页面元素
    var title, chapter, app, c_h, s_h, l_h, page_pos, scroll_enabled;
    function fetchPageElement() {
      try {
        title = _getElement(_title_element_name).innerText;
        chapter = _getElement(_chapter_element_name).innerText;
      } catch (err) {
        title = "微读自动阅读器";
        chapter = "首页";
      }
      app = document.getElementById(_app_element_name);
      c_h = app.clientHeight;
      s_h = app.scrollHeight;
      l_h = s_h - c_h;
      scroll_enabled = true;
      page_pos = 0;
    }
    fetchPageElement();

    //滚动事件
    var onScroll = function() {
      if (!scroll_enabled) return;
      if (page_pos < l_h) {
        page_pos += _page_scroll_distance;
        var progress = (Math.min(page_pos / l_h, 1) * 100).toFixed(2) + "%";
        document.title = `${progress}【${chapter} · ${title}】`;
        scroll(0, page_pos);
        return;
      }
      if (_getElement(_footer_element_name)) {
        fireKeyEvent(document.body, "keydown", 39);
        scroll_enabled = false;
        setTimeout(() => {
          fetchPageElement();
        }, _page_turn_interval);
      } else {
        document.title = `已读完【${chapter}】`;
        alert(document.title);
        sendNotice(document.title);
        clearInterval(_handler);
      }
    };
    _handler = setInterval(onScroll, _page_scroll_interval);
  }

  //-----------worker-------------
  function wxread_worker() {
    var worker;

    //worker 回调
    function worker_fun() {
      postMessage("tick");
    }

    //开启 worker
    function startWorker() {
      var blob = new Blob(["onmessage = function(e){\
      " + worker_fun.toString() + "\
      worker_fun(e.data);}"]);
      var blobURL = window.URL.createObjectURL(blob);
      if (typeof Worker != "undefined") {
        if (typeof worker == "undefined") {
          worker = new Worker(blobURL);
          worker.onmessage = function(event) {
            switch (event.data) {
              case "tick":
                wxAutoReader();
                break;
            }
          };
          worker.postMessage("tick");
        }
      }
    }

    startWorker();
  }

  wxread_worker();
})();
