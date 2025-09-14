import React, { useState } from "react"

declare global {
  interface Window {
    backupAPI: {
      sendEmailBackup: () => Promise<{ success: boolean; message: string }>
    }
  }
}

export default function EmailBackup() {
  const [status, setStatus] = useState("")

  const handleBackup = async () => {
    setStatus("Sending backup...")
    const result = await window.backupAPI.sendEmailBackup()
    setStatus(result.message)
  }

  return (
    <div>
      <h2>Email Backup</h2>
      <button onClick={handleBackup}>Send Backup Now</button>
      <p>{status}</p>
    </div>
  )
}
