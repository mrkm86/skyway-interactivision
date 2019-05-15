/* eslint-disable require-jsdoc */
$(function () {

  let localStream;
  let room;
  var localAudioTrack;
  var localVideoTrack;
  var isResend = false;
  const STATUS_RETRY = "RETRY";
  const STATUS_CALLING = "CALLING";
  const STATUS_HANGUP = "HANGUP";
  var dtMove = new Date();
  var selAspectRatio = 16 / 9;
  var peerWidth = 640;
  var peerHeight = 360;

  var iXScale = 0;
  var iYScale = 0;

  var ResolutionToCheck = [
    { width: 320, height: 320 },    //1:1
    { width: 320, height: 180 },    //16:9
    { width: 320, height: 240 },    //4:3
    { width: 640, height: 640 },
    { width: 640, height: 360 },
    { width: 640, height: 480 },
    { width: 1280, height: 1280 },
    { width: 1280, height: 720 },
    { width: 1280, height: 960 },
    { width: 1920, height: 1920 },
    { width: 1920, height: 1080 },
    { width: 1920, height: 1440 }
  ];

  var ResolutionResult = [];
  var selWidth = 320;
  var selHeight = 240;
  var indexCheck = 0;

  for (indexCheck = 2; indexCheck < 230; indexCheck++) {
    var number = 50;
    ResolutionToCheck.push({ width: 1920 + (number * indexCheck), height: 1920 + (number * indexCheck) });
    ResolutionToCheck.push({ width: 1920 + (number * indexCheck), height: (1920 + (number * indexCheck)) / (16/9) });
    ResolutionToCheck.push({ width: 1920 + (number * indexCheck), height: (1920 + (number * indexCheck)) / (4/3) });
  }

  //Reset idnex check
  indexCheck = 0;

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
      $('#their-videos').css('max-height', $('body').height() + 'px');

      //No Peer Camera
      if ($('.remoteVideos').length < 1) {
        //Maximize Self Camera
        maximizeCamera();
      }
      else {
        //Resize for video
        fncReCalcAfterResize();
      }
    });

    //Show/Hide function bar
    $('body').mousemove(function (event) {
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

          $('#wrapp-video').css('height', iYScale + 'px');
        }

        //Set call status
        callStatus(STATUS_HANGUP);

        //Close for kiosk mode only
        window.close();
      }
      else if ($(this).hasClass('button-retry')) {
        //step1();
        fnc_GetCameraAspectRatio();
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
      //step1();

      /*
        (1) prepare the pico.js face detector
      */
      //let facefinder_classify_region = function(r, c, s, pixels, ldim) {return -1.0;};
      const cascadeurl = 'https://raw.githubusercontent.com/nenadmarkus/pico/c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder';
      fetch(cascadeurl).then(function(response) {
          response.arrayBuffer().then(function(buffer) {
              let bytes = new Int8Array(buffer);
              facefinder_classify_region = pico.unpack_cascade(bytes);
              console.log('* cascade loaded');

              /*
                  (4) instantiate camera handling
              */
             fnc_GetCameraAspectRatio();
          })
      })
      
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

        videoSelect.on('change', fnc_GetCameraAspectRatio);
        audioSelect.on('change', fnc_GetCameraAspectRatio);
        speakerSelect.on('change', fnc_GetCameraAspectRatio);
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
      Enabled: localAudioTrack.enabled,
      AspectRatioWidth: selWidth,
      AspectRatioHeight: selHeight
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

    // [exact] -> Get the best resolution from any device (Resolution > 640x480)
    const constraints = {
      audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
      video: {
          width: {exact: selWidth}, 
          height: {exact: selHeight},
          frameRate: 30,
          deviceId: videoSource ? { exact: videoSource } : undefined
        }
    };

    //stop stream
    if (localStream) {
      for (let track of localStream.getTracks()) 
      { 
          track.stop();
      }
    }

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

    //Re calculate ratio
    fncReCalcRatio();

    //Maximize Self Camera
    if ($('.remoteVideos').length == 0) {
      $('#seft-video').css('max-height', $('body').height() + 'px');

      $('#wrapp-video').removeClass('my-video-multi');
      $('#wrapp-video').addClass('my-video-single');
      $('#self-mic').addClass('item-visible');

      $('#wrapp-video').css('height', iYScale + 'px');
      $('#wrapp-video').css('width', iXScale + 'px');
    }
    //Resize camera first For multi video (Width/Height Fixed -> Width/Height 100%)
    else if ($('.remoteVideos').length == 1) {
      $('.group_video').removeAttr('style');
      $('.group_video').attr('style', 'height:' + iYScale + 'px;width:' + iXScale + 'px;float:left;');
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

      var iWidthBody = $('body').width();
      var iHeightBody = $('body').height();
      var iWidth = iXScale / 2;
      var iHeight = iYScale / 2;
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
        elmHTML += 'style="height:' + iYScale + 'px;width:' + iXScale + 'px;float:left;"';
        elmHTML += '>';
        elmHTML += '  <div class="group_video_child">';
        elmHTML += '    <div class="peer-mic peer-mic_' + peerId + ' item-visible"></div>';
        elmHTML += '    <video id="remoteVideos_' + peerId + '" class="remoteVideos" autoplay playsinline/>';
        elmHTML += '    <canvas id="from-video_' + peerId + '" class="from-video"></canvas>';
        elmHTML += '    <input type="hidden" id="tracking_started_' + peerId + '" />';
        elmHTML += '    <input type="hidden" id="adjustment_of_x_' + peerId + '" />';         // x座標の調整 = -15;
        elmHTML += '    <input type="hidden" id="adjustment_of_y_' + peerId + '" />';         // y座標の調整 = -15;
        elmHTML += '    <input type="hidden" id="adjustment_of_w_' + peerId + '" />';         // 横幅の調整  = Math.abs(adjustment_of_x * 2);
        elmHTML += '    <input type="hidden" id="adjustment_of_h_' + peerId + '" />';         // 縦幅の調整  = Math.abs(adjustment_of_y * 2);
        elmHTML += '    <div id="dummy-box_' + peerId + '" class="dummy-box">';
        elmHTML += '        <div class="bar">';
        elmHTML += '            <div class="range">';
        elmHTML += '                <span class="range-val-wrapper">Left and right margins: <span class="range-val"></span></span>';
        elmHTML += '                <input id="adjustment_of_x_' + peerId + '" type="range" min="0" max="60" value="15">';
        elmHTML += '           </div>';
        elmHTML += '            <div class="range">';
        elmHTML += '                <span class="range-val-wrapper">Top and bottom margins: <span class="range-val"></span></span>';
        elmHTML += '                <input id="adjustment_of_y_' + peerId + '" type="range" min="0" max="60" value="15">';
        elmHTML += '           </div>';
        elmHTML += '        </div>';
        elmHTML += '    </div>';
        elmHTML += '  </div>';
        elmHTML += '</div>';
      }
      else {
        elmHTML += '<div class="group_video video_' + peerId + '" id="' + id + '"';
        elmHTML += 'style="height:' + iHeight + 'px;width:' + iWidth + 'px;float:left;"';
        elmHTML += '>';
        elmHTML += '  <div class="group_video_child">';
        elmHTML += '    <div class="peer-mic peer-mic_' + peerId + ' item-visible"></div>';
        elmHTML += '    <video id="remoteVideos_' + peerId + '" class="remoteVideos" autoplay playsinline/>';
        elmHTML += '    <canvas id="from-video_' + peerId + '" class="from-video"></canvas>';
        elmHTML += '    <input type="hidden" id="tracking_started_' + peerId + '" />';
        elmHTML += '    <input type="hidden" id="adjustment_of_x_' + peerId + '" />';         // x座標の調整 = -15;
        elmHTML += '    <input type="hidden" id="adjustment_of_y_' + peerId + '" />';         // y座標の調整 = -15;
        elmHTML += '    <input type="hidden" id="adjustment_of_w_' + peerId + '" />';         // 横幅の調整  = Math.abs(adjustment_of_x * 2);
        elmHTML += '    <input type="hidden" id="adjustment_of_h_' + peerId + '" />';         // 縦幅の調整  = Math.abs(adjustment_of_y * 2);
        elmHTML += '    <div id="dummy-box_' + peerId + '" class="dummy-box">';
        elmHTML += '        <div class="bar">';
        elmHTML += '            <div class="range">';
        elmHTML += '                <span class="range-val-wrapper">Left and right margins: <span class="range-val"></span></span>';
        elmHTML += '                <input id="adjustment_of_x_' + peerId + '" type="range" min="0" max="60" value="15">';
        elmHTML += '           </div>';
        elmHTML += '            <div class="range">';
        elmHTML += '                <span class="range-val-wrapper">Top and bottom margins: <span class="range-val"></span></span>';
        elmHTML += '                <input id="adjustment_of_y_' + peerId + '" type="range" min="0" max="60" value="15">';
        elmHTML += '           </div>';
        elmHTML += '        </div>';
        elmHTML += '    </div>';
        elmHTML += '  </div>';
        elmHTML += '</div>';
      }

      $('#their-videos').append(elmHTML);

      //Resize camera first For multi video (Width/Height 100% -> Width/Height Fixed)
      if ($('.remoteVideos').length > 1) {
        if ($('.group_video:first').width() != (iWidth / 2)) {
          $('.group_video').removeAttr('style');
          $('.group_video').attr('style', 'height:' + iHeight + 'px;width:' + iWidth + 'px;float:left;');
        }
      }
      else {
      }

      //Resize Image
      fncReCalcAfterResize();

      const el = $('#' + id).find('video').get(0);
      el.srcObject = stream;
      el.play();

      //Send Mic status to remote peer
      sendAudioSignal();

      var video     = document.getElementById('remoteVideos_' + peerId);
      video.width   = selWidth;
      video.height  = selHeight;

      var video_canvas    = document.getElementById('from-video_' + peerId);
      video_canvas.width  = selWidth;
      video_canvas.height = selHeight;

      //Start face detect
      PICO_FACE.init_face_margin(peerId);
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

      peerWidth = data.AspectRatioWidth;
      peerHeight = data.AspectRatioHeight;

      //Resize Image
      fncReCalcAfterResize();

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
  function fncShowHideFunctionBar() {
    var second = (new Date).getTime() - dtMove.getTime();
    var miliSecond = second % 1000;
    second = (second - miliSecond) / 1000;

    if (second >= 3 && !$('#step2').is(":hidden")) {
      $('#step2').hide();
    }
  }

  /****************************/
  /** Calculate Ratio *********/
  /****************************/
  function fncReCalcRatio() {

    var rateValue = 16 / 9;
    var iWidthBody = $('body').width();
    var iHeightBody = $('body').height();
    var iWidthScroll = 17;
    var iHeightRemote = ($('.group_video').length / 2) * $('.group_video').height();

    if ($('.remoteVideos').length > 0) {
      rateValue = peerWidth / peerHeight;
    }
    else {
      rateValue = selAspectRatio;
    }

    iYScale = Math.round(iWidthBody / rateValue);
    iXScale = iWidthBody;

    if (iYScale <= iHeightBody) return;

    if ($('.remoteVideos').length == 0) {
      iYScale = Math.round((iWidthBody - iWidthScroll) / rateValue);
      iXScale = iWidthBody - iWidthScroll;
    }
    else if ($('.remoteVideos').length == 1 && iYScale > iHeightBody) {
      iYScale = Math.round((iWidthBody - iWidthScroll) / rateValue);
      iXScale = iWidthBody - iWidthScroll;
    }
    else if ($('.remoteVideos').length > 1 && iHeightRemote > iHeightBody) {
      iYScale = Math.round((iWidthBody - iWidthScroll) / rateValue);
      iXScale = iWidthBody - iWidthScroll;
    }
  }

  /*********************************/
  /** Calculate width and height **/
  /*******************************/
  function fncReCalcAfterResize() {

    //Single Camera
    if ($('.group_video').length == 1) {
      //Re calculate ratio
      fncReCalcRatio();
      $('.group_video').attr('style', 'height:' + iYScale + 'px;width:' + iXScale + 'px;float:left;');
    }
    //Multi Camera
    else {
      //Re calculate ratio
      fncReCalcRatio();
      var iWidth = iXScale / 2;
      var iHeight = iYScale / 2;

      $('.group_video').attr('style', 'height:' + iHeight + 'px;width:' + iWidth + 'px;float:left;');
    }
  }

  /*********************************/
  /** Get Camera Resolution **/
  /*******************************/
  function fnc_GetCameraAspectRatio() {

    const videoSource = $('#videoSource').val();

    if (indexCheck == ResolutionToCheck.length) {
      ResolutionResult.forEach((value) => {

        if (selWidth < value.width) {
          selWidth = value.width;
          selHeight = value.height;
        }
        else if (selWidth == value.width && selHeight < value.height) {
          selHeight = value.height;
        }

      });

      selAspectRatio = selWidth / selHeight;
      indexCheck = 0;
      ResolutionResult = [];

      //Load camera
      step1();

      return;
    }

    // [exact] -> Get the best resolution from any device (Resolution > 640x480)
    const constraints = {
      audio: true,
      video:
      {
        width: {exact: ResolutionToCheck[indexCheck].width },
        height: {exact: ResolutionToCheck[indexCheck].height },
        frameRate: 30,
        deviceId: videoSource ? { exact: videoSource } : undefined
      },
    };

    navigator.mediaDevices.getUserMedia(constraints).then(fnc_GetCameraResolution_Success).catch(fnc_GetCameraResolution_Err);
  }

  function fnc_GetCameraResolution_Success(stream) {

    ResolutionResult.push({ width: ResolutionToCheck[indexCheck].width, height: ResolutionToCheck[indexCheck].height });
    indexCheck++;

    //stop stream
    for (let track of stream.getTracks()) 
    { 
        track.stop();
    }
    
    fnc_GetCameraAspectRatio();
  }

  function fnc_GetCameraResolution_Err() {
    indexCheck++;
    fnc_GetCameraAspectRatio();
  }

});
