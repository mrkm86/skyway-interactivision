/* eslint-disable require-jsdoc */
$(function () {

  const RTCStatsInsight = window.RTCStatsWrapper.RTCStatsInsight;
  const RTCStatsInsightEvents = window.RTCStatsWrapper.RTCStatsInsightEvents;
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
  var clsPositionSelf = "bottom-right";
  var paramsURL = {};
  var iDeivcesCnt = 0;//ANHLD_TEMP
  var isStartFlg = false;

  var iXScale = 0;
  var iYScale = 0;

  var selWidth = 1920;
  var selHeight = 1080;

  console.log('**** Test_20200908 ****');
  fnc_LogWrite('Test_20200908', '01_Start'); //20200908 ANHLD_TEMP (Test Disconnect)
  fnc_LogWrite('Test_20200824', '01_Start'); //20200824 ANHLD_TEMP (Test Disconnect)

  //20200923 ANHLD ADD START
  //Set call status
  callStatus(STATUS_HANGUP);
  //20200923 ANHLD ADD END

  if (!isNaN(window.VIDEO_WIDTH)) {
    selWidth = VIDEO_WIDTH;
  }

  if (!isNaN(window.VIDEO_HEIGHT)) {
    selHeight = VIDEO_HEIGHT;
  }

  //Set title
  document.title = window.__SKYWAY_ROOM__;
  //Set title for Modal
  $('#model-setting-page > .modal-content > h2:first').html('INTERACTIVISION(' + window.__SKYWAY_ROOM__ + ')');

  // Peer object
  const peer = new Peer({
    key: window.__SKYWAY_KEY__,
    debug: 3,
  });

  fnc_LogWrite('Test_20200824', '02_Start'); //20200824 ANHLD_TEMP (Test Disconnect)

  //Detect mouse move
  mouseMoveInterval = setInterval(fncShowHideFunctionBar, 1000);

  //20200923 ANHLD EDIT START
  // initSkyway();
  // addEventFunction();

  setTimeout(() => {

    //Add event
    addEventFunction();

    peer.on('close', function() {
      peer.destroy();
    });
  
    peer.on('open', () => {
      initSkyway();
    });
  
    peer.on('error', err => {
  
      console.error(err); //20200824 ANHLD_TEMP (Test Disconnect)
      fnc_LogWrite('Test_20200824', '03_peer.on(Error) 01:' + err.message); //20200824 ANHLD_TEMP (Test Disconnect)
  
      try {
        peer.destroy();
        peer.reconnect();
      } catch (error) {
        console.log('>>>peer.destroy (error)');
        console.log(error);
        console.log('<<<peer.destroy (error)');
        window.location.reload();
      }
      
      //Turn off Error: Cannot connect to new Peer before connecting to SkyWay server or after disconnecting from the server.
      if (err.type != 'disconnected') {
        //alert(err.message);
        fnc_LogWrite('Test', '[initSkyway]_peer.on_error()');  //ANHLD_TEMP
        window.location.reload();
      }
  
      fnc_LogWrite('Test_20200824', '03_peer.on(Error) 02'); //20200824 ANHLD_TEMP (Test Disconnect)
    }, 1000);
  
  });
  //20200923 ANHLD EDIT END

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
    $('.pure-u-2-3').dblclick(async function () {

        // set up audio and video input selectors
        const audioSelect = $('#audioSource');
        const videoSelect = $('#videoSource');
        const speakerSelect = $('#speakerSource');
        const selectors = [audioSelect, videoSelect, speakerSelect];

        await navigator.mediaDevices.enumerateDevices()
        .then(deviceInfos => {
          const values = selectors.map(select => select.val() || '');

          audioSelect.empty();
          videoSelect.empty();
          speakerSelect.empty();

          fnc_LogWrite('Test', '[initSkyway]_Devices Length:' + deviceInfos.length);  //ANHLD_TEMP
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
              iDeivcesCnt++; //ANHLD_TEMP
              fnc_LogWrite('Test', '[initSkyway]_Camera Devices:' + deviceInfo.label);  //ANHLD_TEMP
              console.log('Camera Devices:' + deviceInfo.label);
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
      });

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
          $('#wrapp-video').removeClass(clsPositionSelf);
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

    fnc_LogWrite('info', 'OnOffVideo is started.');
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
    fnc_LogWrite('info', 'OnOffVideo is completed.');
  }

  function OnOffMicrophone(isOn) {

    fnc_LogWrite('info', 'OnOffMicrophone is started.');

    var ctrl = $('#button-microphone');
    localAudioTrack.enabled = isOn;

    setTimeout(() => {
      if (isOn) {
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

    fnc_LogWrite('info', 'OnOffMicrophone is completed.');
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

    fnc_LogWrite('info', 'joinConference is started.');
    fnc_LogWrite('Test', '[joinConference]_[' + localStream.id + ']');  //ANHLD_TEMP

    // Initiate a call!
    if (!window.__SKYWAY_ROOM__) {
      return;
    }

    //room = peer.joinRoom('mesh_video_' + window.__SKYWAY_ROOM__, { stream: localStream });
    var roomOptions = {
      stream: localStream,
      videoCodec: 'VP9'
    }
    room = peer.joinRoom('mesh_video_' + window.__SKYWAY_ROOM__, roomOptions);

    //Set call status
    callStatus(STATUS_CALLING);
    //Turn on video
    OnOffVideo(true);

    //Microphone devices is mute
    if (localAudioTrack.muted) {
      paramsURL["mute"] = true;
    }

    //Turn On/Off Microphone
    OnOffMicrophone(!paramsURL["mute"]);

    //Display video
    step3(room);

    fnc_LogWrite('info', 'joinConference is completed.');
    fnc_LogWrite('info', 'boot operation is completed.');
  }

  /****************************/
  /** Initial *****************/
  /****************************/
  async function initSkyway() {

    fnc_LogWrite('info', 'boot operation is started.');
    fnc_LogWrite('info', 'initSkyway is started.');

    //Get parameter from url
    paramsURL = getUrlParams();

    if (paramsURL["mute"] == null || paramsURL["mute"] == undefined) {
      paramsURL["mute"] = true;
    }

    if (paramsURL["position"] == null || paramsURL["mute"] == undefined) {
      paramsURL["position"] = "right";
    }

    if (paramsURL["position"] == "right") {
      clsPositionSelf = "bottom-right";
    }
    else {
      clsPositionSelf = "bottom-left";
    }

    //20200923 ANHLD DELETE START
    // //Set call status
    // callStatus(STATUS_HANGUP);
    //20200923 ANHLD DELETE END

    // set up audio and video input selectors
    const audioSelect = $('#audioSource');
    const videoSelect = $('#videoSource');
    const speakerSelect = $('#speakerSource');
    const selectors = [audioSelect, videoSelect, speakerSelect];

    isStartFlg = false;
    iDeivcesCnt = 0; //ANHLD_TEMP
    fnc_LogWrite('Test', '[initSkyway]_navigator.mediaDevices.enumerateDevices()');  //ANHLD_TEMP

    //20200923 ANHLD DELETE START
    // peer.on('close', function() {
    //   peer.destroy();
    // });

    // peer.on('open', () => {
    //   // Get things started
    //   step1();
    // });

    // peer.on('error', err => {

    //   console.error(err); //20200824 ANHLD_TEMP (Test Disconnect)
    //   fnc_LogWrite('Test_20200824', '03_peer.on(Error) 01:' + err.message); //20200824 ANHLD_TEMP (Test Disconnect)

    //   //20200908 ANHLD EDIT START
    //   // peer.destroy();
    //   // peer.reconnect();

    //   //Turn off Error: You do not have permission to access this room
    //   //Turn off Error: Uncaught RangeError: Maximum call stack size exceeded
    //   try {
    //     peer.destroy();
    //     peer.reconnect();
    //   } catch (error) {
    //     console.log('>>>peer.destroy (error)');
    //     console.log(error);
    //     console.log('<<<peer.destroy (error)');
    //     window.location.reload();
    //   }
    //   //20200908 ANHLD EDIT END
      
    //   //Turn off Error: Cannot connect to new Peer before connecting to SkyWay server or after disconnecting from the server.
    //   if (err.type != 'disconnected') {
    //     //alert(err.message);
    //     fnc_LogWrite('Test', '[initSkyway]_peer.on_error()');  //ANHLD_TEMP
    //     window.location.reload();
    //   }

    //   fnc_LogWrite('Test_20200824', '03_peer.on(Error) 02'); //20200824 ANHLD_TEMP (Test Disconnect)
    //   // Return to step 2 if error occurs
    //   //step2();
    // });

    //20200923 ANHLD DELETE END

    await navigator.mediaDevices.enumerateDevices()
      .then(deviceInfos => {
        const values = selectors.map(select => select.val() || '');
        selectors.forEach(select => {
          const children = select.children(':first');
          while (children.length) {
            select.remove(children);
          }
        });

        fnc_LogWrite('Test', '[initSkyway]_Devices Length:' + deviceInfos.length);  //ANHLD_TEMP
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
            iDeivcesCnt++; //ANHLD_TEMP
            fnc_LogWrite('Test', '[initSkyway]_Camera Devices:' + deviceInfo.label);  //ANHLD_TEMP
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

        isStartFlg = true;
        step1();
    });

    //Reset devices when Change or Disabled devices.
    navigator.mediaDevices.ondevicechange = async function (event) {

      //Check Vieo is not found
      await navigator.mediaDevices.enumerateDevices()
        .then(deviceInfos => {

          var iVideoFlg = 0;
          for (let i = 0; i !== deviceInfos.length; ++i) {
            const deviceInfo = deviceInfos[i];
            if  (deviceInfo == null) continue;

            if (deviceInfo.kind === 'videoinput') {
              iVideoFlg++;
            }
          }

          if (iVideoFlg == 0) {
            fnc_LogWrite('error', 'video device is not found. Page is Reload.');
            window.location.reload();
            return;
          }
        
          iDeivcesCnt = iVideoFlg; //ANHLD_TEMP
          fnc_LogWrite('Test', '[initSkyway]_navigator.mediaDevices.ondevicechange:' + iVideoFlg);  //ANHLD_TEMP
      });
    }

    fnc_LogWrite('info', 'initSkyway is completed.');
  }

  /**********************************/
  /** Send Singal to remote Peer */
  /********************************/
  function sendAudioSignal() {

    fnc_LogWrite('info', 'sendAudioSignal is started.');

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

    fnc_LogWrite('Test', 'dataSend[' + localStream.id +']:' + JSON.stringify(dataSend));  //ANHLD_TEMP
    room.send(dataSend);

    fnc_LogWrite('info', 'sendAudioSignal is completed.');
  }

  /**********************************/
  /** Get Devices and Video Stream */
  /********************************/
  function step1() {

    fnc_LogWrite('Test', '[step1]_isStartFlg:' + isStartFlg);  //ANHLD_TEMP
    if (!isStartFlg) return;
    
    fnc_LogWrite('info', 'step1 is started.');

    // Get audio/video stream
    const audioSource = $('#audioSource').val();
    const videoSource = $('#videoSource').val();

    // [exact] -> Get the best resolution from any device (Resolution > 640x480)
    const constraints = {
      audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
      video: {
        width: { ideal: selWidth },
        height: { ideal: selHeight },
        frameRate: 30,
        deviceId: videoSource ? { exact: videoSource } : undefined
      }
    };

    fnc_LogWrite('Test', '[step1]_iDeivcesCnt:' + iDeivcesCnt);  //ANHLD_TEMP

    if (videoSource == null) {
      callStatus(STATUS_RETRY);
      fnc_LogWrite('error', 'video device is not found.');
      window.location.reload();
      return;
    }

    if (audioSource == null) {
      callStatus(STATUS_RETRY);
      fnc_LogWrite('error', 'audio device is not found.');
      return;
    }

    //Get video stream for self video
    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      $('#my-video').get(0).srcObject = stream;
      localStream = stream;
      localAudioTrack = localStream.getAudioTracks()[0];
      localVideoTrack = localStream.getVideoTracks()[0];

      //Turn On/Off Microphone
      OnOffMicrophone(!paramsURL["mute"]);

      setTimeout(() => {
        //Mute Microphone Event
        localAudioTrack.onmute = function (event) {
          //localAudioTrack.enabled = false;
          OnOffMicrophone(false);
        }
        //unMute Microphone Event
        localAudioTrack.onunmute = function (event) {
          //localAudioTrack.enabled = true;
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
      }, 1000);

    }).catch(err => {
      //Set call status
      callStatus(STATUS_RETRY);
      console.error(err);

      //20200827 ANHLD_TEMP (Test Disconnect)
      fnc_LogWrite('error', 'step1 is error (navigator.mediaDevices.getUserMedia).');
      window.location.reload(); 
      //20200827 ANHLD_TEMP (Test Disconnect)
    });

    fnc_LogWrite('info', 'step1 is completed.');
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
      $('#wrapp-video').removeClass(clsPositionSelf);
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

    fnc_LogWrite('info', 'step3 is started.');

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
        $('#wrapp-video').addClass(clsPositionSelf);

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
        elmHTML += '    <video class="remoteVideos" autoplay playsinline>';
        elmHTML += '  </div>';
        elmHTML += '</div>';
      }
      else {
        elmHTML += '<div class="group_video video_' + peerId + '" id="' + id + '"';
        elmHTML += 'style="height:' + iHeight + 'px;width:' + iWidth + 'px;float:left;"';
        elmHTML += '>';
        elmHTML += '  <div class="group_video_child">';
        elmHTML += '    <div class="peer-mic peer-mic_' + peerId + ' item-visible"></div>';
        elmHTML += '    <video class="remoteVideos" autoplay playsinline>';
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

      const options = {
        interval: 1000,
        thresholds: {
          "video-fractionLost": { //Percent
            unstable: 0.08,       
            critical: 0.15
          },
          "video-jitter": {   //Second
            unstable: 0.03,
            critical: 0.1
          },
          "video-jitterBufferDelay": {  //Second
            unstable: 0.05,
            critical: 0.1
          },
          "video-rtt": {  //Second
            unstable: 0.4,
            critical: 0.8
          }
        },
        triggerCondition: {
          failCount: 1,
          within: 3
        }
      }

      for (var key in room.connections) {
        var pc = room.connections[key][0].getPeerConnection();
        
        if (pc == null) continue;

        var insight = new RTCStatsInsight(pc, options);
        insight.on(RTCStatsInsightEvents["video-fractionLost"].key, event => {
          if  (event.level === 'critical') {
            fnc_LogWrite('info', '[video-fractionLost] Resart is Started.');
            step1();
            fnc_LogWrite('info', '[video-fractionLost] Resart is completed.');
          }
        });

        insight.on(RTCStatsInsightEvents["video-jitter"].key, event => {
          if  (event.level === 'critical') {
            fnc_LogWrite('info', '[video-jitter] Resart is Started.');
            step1();
            fnc_LogWrite('info', '[video-jitter] Resart is completed.');
          }
        });

        insight.on(RTCStatsInsightEvents["video-jitterBufferDelay"].key, event => {
          if  (event.level === 'critical') {
            fnc_LogWrite('info', '[video-jitterBufferDelay] Resart is Started.');
            step1();
            fnc_LogWrite('info', '[video-jitterBufferDelay] Resart is completed.');
          }
        });

        insight.on(RTCStatsInsightEvents["video-rtt"].key, event => {
          if  (event.level === 'critical') {
            fnc_LogWrite('info', '[video-rtt] Resart is Started.');
            step1();
            fnc_LogWrite('info', '[video-rtt] Resart is completed.');
          }
        });

        insight.watch();

        //Check iceconnection state for RTCPeerconnection
        pc.oniceconnectionstatechange = function(event) {
          switch(pc.iceConnectionState) {
            case "connected":
              // The connection has become fully connected
              break;

            case "disconnected":
              break;

            case "failed":
              // One or more transports has terminated unexpectedly or in an error
              break;

            case "closed":
              // The iceconnection has been closed (ignore End Call)
              if (!pc.connectionState == 'closed') 
              {
                fnc_LogWrite('error', 'The iceConnection has been closed.');
                window.location.reload();
                return;
              }
              
              break;
          }

          console.log("** Check iceconnection state for RTCPeerconnection [" + pc.iceConnectionState +"]");
          console.log("** Check connection state for RTCPeerconnection [" + pc.connectionState +"]");
        }
      }
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
  
    fnc_LogWrite('info', 'step3 is completed.');

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
  /** Write Log Function         **/
  /*******************************/
  function fnc_LogWrite(strLevel, strMessage) {

    var now = new Date();
    var year = now.getFullYear();
    var month = ("0" + (now.getMonth() + 1)).slice(-2);
    var date = ("0" + now.getDate()).slice(-2);
    var hour = ("0" + now.getHours()).slice(-2);
    var minute = ("0" + now.getMinutes()).slice(-2);
    var second = ("0" + now.getSeconds()).slice(-2);
    var milisecond = ("00" + now.getMilliseconds()).slice(-3);

    var dataSend =
    {
      time: year + "" + month + "" + date + " " + hour + ":" + minute + ":" + second + "." + milisecond,
      user: window.location.pathname,
      level: strLevel,
      message: strMessage
    }

    $.ajax({
      type: 'POST',
      url: WEBHOOK,
      data: JSON.stringify(dataSend),
      contentType: "application/json; charset=utf-8",
      success: function (data) {
        console.log("====>Success:" + JSON.stringify(data));
      },

      error: function (jqXHR, textStatus, errorThrown) {
        //alert(errorThrown);
        console.log(errorThrown);
        window.location.reload(); //20200827 ANHLD_TEMP (Test Disconnect)
      }

    });
  }

  /*********************************/
  /** Get parameters from URL    **/
  /*******************************/
  function getUrlParams() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,    
                                            function(m, key, value) {
                                              if (value == "false") vars[key] = false;
                                              else if (value == "true") vars[key] = true;
                                              else vars[key] = value;
                                            });
    return vars;
  }

});
