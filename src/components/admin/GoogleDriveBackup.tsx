import React, { useState } from 'react';

declare global {
  interface Window {
    driveAPI: {
      backup: () => Promise<{ success: boolean; message: string; needsAuth?: boolean }>;
      authorize: () => Promise<{ success: boolean; url?: string; message?: string }>;
      completeAuth: (authCode: string) => Promise<{ success: boolean; message?: string }>;
    };
  }
}

export default function GoogleDriveBackup() {
  const [status, setStatus] = useState('');
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authCode, setAuthCode] = useState('');

  const startBackup = async () => {
    setStatus('Starting backup...');
    const result = await window.driveAPI.backup();

    if (result.success) {
      setStatus(result.message);
      setAuthUrl(null);
    } else {
      setStatus(result.message);
      if (result.needsAuth) {
        const res = await window.driveAPI.authorize();
        if (res.url) {
          setAuthUrl(res.url);
          setShowAuthModal(true); // show modal immediately
        }
      }
    }
  };

  const startAuth = async () => {
    const res = await window.driveAPI.authorize();
    if (res.success) {
      setStatus('Already authorized');
      setAuthUrl(null);
    } else if (res.url) {
      setStatus('Authorization required. Please log in.');
      setAuthUrl(res.url);
      setShowAuthModal(true);
    } else {
      setStatus(`Error: ${res.message}`);
    }
  };

  const completeAuth = async () => {
    if (!authCode.trim()) {
      setStatus('Please enter a valid authorization code.');
      return;
    }

    setStatus('Completing authorization...');
    const res = await window.driveAPI.completeAuth(authCode.trim());

    if (res.success) {
      setStatus('Authorization complete! Retrying backup...');
      setAuthUrl(null);
      setShowAuthModal(false);
      setAuthCode('');

      // 🔄 Automatically retry backup
      await startBackup();
    } else {
      setStatus(`Error: ${res.message}`);
    }
  };

  return (
    <div>
      <h2>Google Drive Backup</h2>
      <button onClick={startBackup}>Backup Now</button>
      <button onClick={startAuth}>Start Authorization</button>

      {authUrl && (
        <p>
          <a href={authUrl} target="_blank" rel="noopener noreferrer">
            Click here to authorize with Google
          </a>
        </p>
      )}

      {/* Modal for pasting Google auth code */}
      {showAuthModal && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>Enter Google Auth Code</h3>
            <input
              type="text"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={completeAuth}>Submit</button>
              <button
                onClick={() => {
                  setShowAuthModal(false);
                  setAuthCode('');
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <p>{status}</p>
    </div>
  );
}

// 🔧 Basic inline modal styles
const modalStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalContentStyle: React.CSSProperties = {
  background: 'white',
  padding: '20px',
  borderRadius: '8px',
  width: '300px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
};
