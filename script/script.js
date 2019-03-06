/* eslint-disable require-jsdoc */
$(function () {

  let localStream;
  let room;
  var localAudioTrack;
  var localVideoTrack;
  var iWidthBody = $('body').width();
  var iHeightBody = $('body').height();
  var isResend = false;
  const STATUS_RETRY = "RETRY";
  const STATUS_CALLING = "CALLING";
  const STATUS_HANGUP = "HANGUP";
  var mouseMoveInterval = null;
  var dtMove = new Date();

  //Set title
  document.title = window.__SKYWAY_ROOM__;
  //Set title for Modal
  $('#model-setting-page > .modal-content > h2:first').html('INTERACTIVISION(' + window.__SKYWAY_ROOM__ + ')');

  // Peer object
  const peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  });

  //Detect mouse move
  mouseMoveInterval = setInterval(fncShowHideFunctionBar, 1000);

  initSkyway();
  addEventFunction();

  /****************************/
  /** Addd Event for control */
  /****************************/
  function addEventFunction() {

    //Close Setting Modal
    window.onclick = function (event) {
      if (event.target != null && event.target.id == 'model-setting-page') {
        $('#model-setting-page').css('display', 'none');
      }
    }

    $(window).bind('resize', function () {
      if ($('.remoteVideos').length == 1) {
        $('#their-videos').css('max-height', $('body').height() + 'px');
        $('.remoteVideos:first').css('height', '100%');
        $('.remoteVideos:first').css('width', '100%');

        $('.group_video:first').removeAttr('style');
        $('.group_video:first').attr('style', 'height: 100%; width: 100%;float:left;');
      }
    });

    //Show/Hide function bar
    $('body').mousemove(function(event){
      $('#step2').show();
      dtMove = new Date();
    });

    //Open Setting Modal
    $('.pure-u-2-3').dblclick(function () {
      $('#model-setting-page').css('display', 'block');
    });

    //Close button
    $('.close').click(function () {
      $('#model-setting-page').css('display', 'none');
    });

    //Turn On/Off Video
    $('#button-video').click(function () {
      OnOffVideo(!localVideoTrack.enabled);
    });

    //Turn On/Off Microphone
    $('#button-microphone').click(function () {
      //Check microphone devices
      if (localAudioTrack.muted) return;

      //On/Off Microphone
      OnOffMicrophone(!localAudioTrack.enabled);
    });

    //End call button
    $('#button-call').click(function () {

      //Calling status
      if ($(this).hasClass('button-calling')) {

        room.close();

        //Clear control
        step2();

        //Maximize Self Camera
        if ($('.remoteVideos').length == 0) {
          $('#wrapp-video').removeClass('my-video-multi');
          $('#wrapp-video').addClass('my-video-single');
          $('#self-mic').addClass('item-visible');
        }

        //Set call status
        callStatus(STATUS_HANGUP);

        //Close for kiosk mode only
        window.close();
      }
      else if ($(this).hasClass('button-retry')) {
        step1();
      }
      //hangup or retry 
      else {
        step2();
        joinConference();
      }
    });
  }

  function OnOffVideo(isOn) {
    var ctrl = $('#button-video');
    localVideoTrack.enabled = isOn;

    if (isOn) {
      ctrl.removeClass('button-video-off');
      ctrl.addClass('button-video-on');
    }
    else {
      ctrl.removeClass('button-video-on');
      ctrl.addClass('button-video-off');
    }
  }

  function OnOffMicrophone(isOn) {
    var ctrl = $('#button-microphone');
    localAudioTrack.enabled = isOn;

    setTimeout(() => {
      if (localAudioTrack.enabled) {
        ctrl.removeClass('button-microphone-off');
        ctrl.addClass('button-microphone-on');
        $('#self-mic').addClass('item-visible');
      }
      else {
        ctrl.removeClass('button-microphone-on');
        ctrl.addClass('button-microphone-off');

        if ($('#wrapp-video').hasClass("my-video-multi")) {
          $('#self-mic').removeClass('item-visible');
        }
      }

      if ($('.remoteVideos').length > 0) {
        //Send Mic status to remote peer
        sendAudioSignal();
      }
    }, 1000);
  }

  /****************************/
  /** Call status *********/
  /****************************/
  function callStatus(status) {

    var ctrl = $('#button-call');
    ctrl.removeClass('button-calling');
    ctrl.removeClass('button-hangup');
    ctrl.removeClass('button-retry');

    switch (status) {
      case STATUS_RETRY:
        ctrl.addClass('button-retry');
        break;

      case STATUS_CALLING:
        ctrl.addClass('button-calling');
        break;

      case STATUS_HANGUP:
        ctrl.addClass('button-hangup');
        break;
    }
  }

  /****************************/
  /** Join Conference *********/
  /****************************/
  function joinConference() {
    // Initiate a call!
    if (!window.__SKYWAY_ROOM__) {
      return;
    }

    room = peer.joinRoom('mesh_video_' + window.__SKYWAY_ROOM__, { stream: localStream });

    //Set call status
    callStatus(STATUS_CALLING);
    //Turn on video
    OnOffVideo(true);

    //Microphone devices is mute
    if (localAudioTrack.muted) {
      OnOffMicrophone(false);
    }
    else {
      //Turn On/Off Microphone
      OnOffMicrophone(!INITIALIZE_MUTE);
    }

    //Display video
    step3(room);
  }

  /****************************/
  /** Initial *****************/
  /****************************/
  function initSkyway() {

    //Set call status
    callStatus(STATUS_HANGUP);

    peer.on('open', () => {
      // Get things started
      step1();
    });

    peer.on('error', err => {
      //Turn off Error: Cannot connect to new Peer before connecting to SkyWay server or after disconnecting from the server.
      if (err.type != 'disconnected') {
        alert(err.message);
      }
      // Return to step 2 if error occurs
      step2();
    });

    // set up audio and video input selectors
    const audioSelect = $('#audioSource');
    const videoSelect = $('#videoSource');
    const speakerSelect = $('#speakerSource');
    const selectors = [audioSelect, videoSelect, speakerSelect];

    navigator.mediaDevices.enumerateDevices()
      .then(deviceInfos => {
        const values = selectors.map(select => select.val() || '');
        selectors.forEach(select => {
          const children = select.children(':first');
          while (children.length) {
            select.remove(children);
          }
        });

        for (let i = 0; i !== deviceInfos.length; ++i) {
          const deviceInfo = deviceInfos[i];
          const option = $('<option>').val(deviceInfo.deviceId);

          if (deviceInfo.kind === 'audioinput') {
            option.text(deviceInfo.label ||
              'Microphone ' + (audioSelect.children().length + 1));
            audioSelect.append(option);
          }
          else if (deviceInfo.kind === 'videoinput') {
            option.text(deviceInfo.label ||
              'Camera ' + (videoSelect.children().length + 1));
            videoSelect.append(option);
          }
          else if (deviceInfo.kind === 'audiooutput') {
            option.text(deviceInfo.label ||
              'Speaker ' + (speakerSelect.children().length + 1));
            speakerSelect.append(option);
          }
        }

        selectors.forEach((select, selectorIndex) => {
          if (Array.prototype.slice.call(select.children()).some(n => {
            return n.value === values[selectorIndex];
          })) {
            select.val(values[selectorIndex]);
          }
        });

        videoSelect.on('change', step1);
        audioSelect.on('change', step1);
        speakerSelect.on('change', step1);
      });

    //Reset devices when Change or Disabled devices.
    navigator.mediaDevices.ondevicechange = function (event) {
      //step1();
    }
  }

  /**********************************/
  /** Send Singal to remote Peer */
  /********************************/
  function sendAudioSignal() {

    //Check First Join.
    if ($('.peer-mic-on').length == 0 && $('.peer-mic-off').length == 0) {
      isResend = true;
    }
    else {
      isResend = false;
    }

    var dataSend = {
      ReSend: isResend,
      Enabled: localAudioTrack.enabled
    }

    room.send(dataSend);
  }

  /**********************************/
  /** Get Devices and Video Stream */
  /********************************/
  function step1() {
    // Get audio/video stream
    const audioSource = $('#audioSource').val();
    const videoSource = $('#videoSource').val();
    const constraints = {
      audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
      video: { deviceId: videoSource ? { exact: videoSource } : undefined },
    };

    //Get video stream for self video
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      $('#my-video').get(0).srcObject = stream;
      localStream = stream;
      localAudioTrack = localStream.getAudioTracks()[0];
      localVideoTrack = localStream.getVideoTracks()[0];

      //Mute Microphone Event
      localAudioTrack.onmute = function (event) {
        localAudioTrack.enabled = false;
        OnOffMicrophone(false);
      }
      //unMute Microphone Event
      localAudioTrack.onunmute = function (event) {
        localAudioTrack.enabled = true;
        OnOffMicrophone(true);
      }

      if (room) {
        room.replaceStream(stream);
        return;
      }

      //Clear control
      step2();

      //Join Conference
      joinConference();

    }).catch(err => {
      //Set call status
      callStatus(STATUS_RETRY);
      console.error(err);
    });
  }

  /****************************************/
  /** Clear control when exit conference */
  /**************************************/
  function step2() {
    $('#their-videos').empty();
    $('#join-room').focus();

    //Maximize Self Camera
    maximizeCamera();
  }

  /****************************/
  /** Maximize Self Camera ***/
  /**************************/
  function maximizeCamera() {
    //Maximize Self Camera
    if ($('.remoteVideos').length == 0) {
      $('#wrapp-video').removeClass('my-video-multi');
      $('#wrapp-video').addClass('my-video-single');
      $('#self-mic').addClass('item-visible');
    }
    //Resize camera first For multi video (Width/Height Fixed -> Width/Height 100%)
    else if ($('.remoteVideos').length == 1) {
      $('.remoteVideos:first').css('height', '100%');
      $('.remoteVideos:first').css('width', '100%');

      $('.group_video:first').removeAttr('style');
      $('.group_video:first').attr('style', 'height: 100%; width: 100%;float:left;');
    }
  }

  /****************************/
  /** Display video ***********/
  /****************************/
  function step3(room) {
    // Wait for stream on the call, then set peer video display
    room.on('stream', stream => {
      const peerId = stream.peerId;
      const id = 'video_' + peerId + '_' + stream.id.replace('{', '').replace('}', '');

      var iWidth = iWidthBody / 2;
      var iHeight = iHeightBody / 2;
      var elmHTML = '';

      //Minimize Self Camera
      if ($('#wrapp-video').hasClass("my-video-single")) {
        $('#wrapp-video').removeClass('my-video-single');
        $('#wrapp-video').addClass('my-video-multi');

        //Trun on MicOff status
        if (!localAudioTrack.enabled) {
          $('#self-mic').removeClass('item-visible');
        }
      }

      if ($('.remoteVideos').length == 0) {
        $('#their-videos').css('max-height', iHeightBody + 'px');

        elmHTML += '<div class="group_video video_' + peerId + '" id="' + id + '"';
        elmHTML += 'style="height:100%; width:100%; float:left;"';
        elmHTML += '>';
        elmHTML += '<div class="peer-mic peer-mic_' + peerId + '"></div>';
        elmHTML += '<video class="remoteVideos" autoplay playsinline>';
        elmHTML += '</div>';
      }
      else {
        elmHTML += '<div class="group_video video_' + peerId + '" id="' + id + '"';
        elmHTML += 'style="height:' + iHeight + 'px;width:' + iWidth + 'px;float:left;"';
        elmHTML += '>';
        elmHTML += '<div class="peer-mic peer-mic_' + peerId + '"></div>';
        elmHTML += '<video class="remoteVideos" autoplay playsinline>';
        elmHTML += '</div>';
      }

      $('#their-videos').append(elmHTML);

      //Resize camera first For multi video (Width/Height 100% -> Width/Height Fixed)
      if ($('.remoteVideos').length > 1) {

        if ($('.remoteVideos:first').width() != iWidth) {
          $('.remoteVideos:first').css('height', iHeight + 'px');
          $('.remoteVideos:first').css('width', iWidth + 'px');

          $('.group_video:first').removeAttr('style');
          $('.group_video:first').attr('style', 'height:' + iHeight + 'px;width:' + iWidth + 'px;float:left;');
        }

      }

      //Has scrollbar
      if ($('#their-videos').get(0).scrollHeight > iHeightBody) {
        iWidthBody = $('#their-videos').get(0).scrollWidth;
        iWidth = iWidthBody / 2;
        iHeight = iHeightBody / 2;
        $('.group_video').attr('style', 'height:' + iHeight + 'px;width:' + iWidth + 'px;float:left;');
      }

      const el = $('#' + id).find('video').get(0);
      el.srcObject = stream;
      el.play();

      //Send Mic status to remote peer
      sendAudioSignal();
    });

    //Recieve data from remote peer.
    room.on('data', strMessage => {
      var peerId = strMessage.src;
      var data = strMessage.data;

      //Check null data
      if (data == null || data == undefined) return;

      if (data.Enabled) {
        $('.peer-mic_' + peerId).removeClass('peer-mic-off');
        $('.peer-mic_' + peerId).addClass('peer-mic-on');
      }
      else {
        $('.peer-mic_' + peerId).removeClass('peer-mic-on');
        $('.peer-mic_' + peerId).addClass('peer-mic-off');
      }

      //First
      if (data.ReSend) {
        sendAudioSignal();
      }

    });

    room.on('removeStream', function (stream) {
      const peerId = stream.peerId;
      $('#video_' + peerId + '_' + stream.id.replace('{', '').replace('}', '')).remove();
    });

    // UI stuff
    room.on('close', step2);
    room.on('peerLeave', peerId => {
      $('.video_' + peerId).remove();

      //Maximize self camera
      maximizeCamera();
    });
  }

  /****************************/
  /** Show/Hide Function bar **/
  /****************************/
  function fncShowHideFunctionBar(){
    var second = (new Date).getTime() - dtMove.getTime();
    var miliSecond = second % 1000;
    second = (second - miliSecond) / 1000;

    if (second >= 3 && !$('#step2').is(":hidden")) {
      $('#step2').hide();
    }
  }
});
