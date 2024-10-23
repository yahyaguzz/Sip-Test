import { useState, useRef } from 'react';
import {
  UserAgent,
  Registerer,
  Inviter,
  SessionState,
  URI, // URI import edildi
} from 'sip.js';

const App = () => {
  const [userAgent, setUserAgent] = useState(null);
  const [registered, setRegistered] = useState(false);
  const [session, setSession] = useState(null);
  const [target, setTarget] = useState('');
  const localAudioRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const domain = 'sip.onsip.com'; // SIP Sunucusu

  // SIP UserAgent ve Registerer kurulum
  const handleRegister = () => {
    if (!username || !password) {
      console.error('Username and password are required!');
      return;
    }

    const transportOptions = {
      server: `wss://edge.${domain}`,
    };

    const userAgentOptions = {
      uri: new URI('sip', username, domain), // URI doğru şekilde oluşturuldu
      transportOptions,
      authorizationUsername: username,
      authorizationPassword: password,
    };

    console.log('UserAgent oluşturuluyor:', userAgentOptions);

    const ua = new UserAgent(userAgentOptions);

    ua.start().then(() => {
      const registerer = new Registerer(ua);
      registerer.register();
      setRegistered(true);
      setUserAgent(ua);
      console.log('Kullanıcı register oldu!');
    }).catch((error) => {
      console.error('Register hata:', error);
    });

    ua.delegate = {
      onInvite(invitation) {
        invitation.accept().then((session) => {
          console.log('Incoming session accepted');
          handleSession(session);
        });
      },
    };
  };

  // Arama başlatma fonksiyonu
  const handleCall = async () => {
    if (userAgent && registered) {
      const targetURI = new URI('sip', target, domain); // Hedef URI burada oluşturuldu

      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = mediaStream;
      }

      const inviteOptions = {
        sessionDescriptionHandlerOptions: {
          constraints: { audio: true },
          localMediaStream: mediaStream,
        },
      };

      const inviter = new Inviter(userAgent, targetURI, inviteOptions); // Inviter'da URI kullanıldı

      inviter.invite().then((session) => {
        handleSession(session);
      }).catch((error) => {
        console.error('Invite hata:', error);
      });
    } else {
      console.error('UserAgent ya da kayıtlı değil!');
    }
  };

  // Oturum yönetimi (session) ve medya akışını ayarlama
  const handleSession = (session) => {
    session.delegate = {
      onSessionDescriptionHandler() {
        const peerConnection = session.sessionDescriptionHandler.peerConnection;
        peerConnection.addEventListener('track', (event) => {
          if (event.track.kind === 'audio') {
            const remoteStream = new MediaStream([event.track]);
            if (remoteAudioRef.current) {
              remoteAudioRef.current.srcObject = remoteStream;
            }
          }
        });
      },
    };

    session.stateChange.addListener((state) => {
      if (state === SessionState.Terminated) {
        console.log('Call ended.');
        setSession(null);
      }
    });

    setSession(session);
  };

  // Çağrı sonlandırma fonksiyonu
  const handleHangup = () => {
    if (session) {
      session.bye();
      setSession(null);
    }
  };

  return (
    <div>
      <h2>SIP.js WebRTC Client</h2>
      
      {/* Register */}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleRegister}>Register</button>

      {/* Arama Yapma */}
      {registered && (
        <>
          <input
            type="text"
            placeholder="Target username"
            onChange={(e) => setTarget(e.target.value)}
          />
          <button onClick={handleCall}>Call</button>
          <button onClick={handleHangup}>Hangup</button>
        </>
      )}

      {/* Ses akışı */}
      <audio ref={localAudioRef} autoPlay muted></audio> {/* Kendi sesi */}
      <audio ref={remoteAudioRef} autoPlay></audio>       {/* Karşı taraf sesi */}
    </div>
  );
};

export default App;
