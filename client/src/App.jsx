import { useEffect, useMemo, useState } from 'react'
import {
  analyzeJob,
  sendMail,
  uploadResume,
  getResume,
  selectResume,
  deleteResume,
} from './services/api'
import './App.css'

function App() {
  const [jobText, setJobText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [analysisStatus, setAnalysisStatus] = useState('idle')
  const [analysisError, setAnalysisError] = useState('')

  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sendStatus, setSendStatus] = useState('idle')
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState('')

  const [resumeInfo, setResumeInfo] = useState({
    hasResume: false,
    path: null,
    selectedResumeSource: 'local',
    selectedCloudinaryResumeId: null,
    cloudinaryResumes: [],
  })
  const [resumeStatus, setResumeStatus] = useState('idle')
  const [resumeError, setResumeError] = useState('')
  const [resumeSelectionError, setResumeSelectionError] = useState('')

  useEffect(() => {
    fetchResumeInfo()
  }, [])

  const fetchResumeInfo = async () => {
    setResumeStatus('loading')
    setResumeError('')
    try {
      const response = await getResume()
      setResumeInfo(
        response.data || {
          hasResume: false,
          path: null,
          selectedResumeSource: 'local',
          selectedCloudinaryResumeId: null,
          cloudinaryResumes: [],
        }
      )
      setResumeStatus('success')
    } catch (err) {
      setResumeStatus('error')
      setResumeError(err?.response?.data?.error || err.message || 'Unable to load resume info')
    }
  }

  const handleSelectResume = async (source, resumeId = null) => {
    setResumeSelectionError('')
    setResumeStatus('loading')
    try {
      await selectResume({ source, resumeId })
      await fetchResumeInfo()
      setResumeStatus('success')
    } catch (err) {
      setResumeStatus('error')
      setResumeSelectionError(err?.response?.data?.error || err.message || 'Failed to select resume')
    }
  }

  const handleAnalyze = async () => {
    setAnalysisError('')
    setAnalysisStatus('loading')
    setAnalysis(null)
    try {
      const response = await analyzeJob(jobText)
      setAnalysis(response.data)
      setAnalysisStatus('success')
      setTo(response.data.email || '')
      setSubject(response.data.subject || '')
      setMessage(response.data.mail || '')
    } catch (err) {
      setAnalysisStatus('error')
      setAnalysisError(err?.response?.data?.error || err.message || 'Failed to analyze job description')
    }
  }

  const handleSendMail = async (event) => {
    event.preventDefault()
    setSendStatus('loading')
    setSendError('')
    setSendSuccess('')

    if (!to || !subject || !message) {
      setSendStatus('error')
      setSendError('Please complete the recipient, subject, and message before sending.')
      return
    }

    const attachResume = Boolean(
      resumeInfo.selectedResumeSource === 'cloudinary'
        ? resumeInfo.selectedCloudinaryResumeId
        : resumeInfo.hasResume
    )

    try {
      await sendMail({
        to,
        subject,
        text: message,
        attachResume,
        company: analysis?.company,
        role: analysis?.role,
      })
      setSendStatus('success')
      setSendSuccess('Email sent successfully.')
      setSendError('')
    } catch (err) {
      setSendStatus('error')
      setSendError(err?.response?.data?.error || err.message || 'Failed to send email')
      setSendSuccess('')
    }
  }

  const handleResumeUpload = async (file) => {
    if (!file) {
      setResumeStatus('error')
      setResumeError('Choose a PDF resume to upload.')
      return
    }
    if (file.type !== 'application/pdf') {
      setResumeStatus('error')
      setResumeError('Only PDF resumes are accepted.')
      return
    }

    setResumeStatus('loading')
    setResumeError('')
    try {
      const formData = new FormData()
      formData.append('resume', file)
      await uploadResume(formData)
      setResumeStatus('success')
      setResumeError('')
      await fetchResumeInfo()
    } catch (err) {
      setResumeStatus('error')
      setResumeError(err?.response?.data?.error || err.message || 'Resume upload failed')
    }
  }

  const handleDeleteResume = async () => {
    setResumeStatus('loading')
    setResumeError('')
    try {
      await deleteResume()
      await fetchResumeInfo()
      setResumeStatus('success')
    } catch (err) {
      setResumeStatus('error')
      setResumeError(err?.response?.data?.error || err.message || 'Failed to remove resume')
    }
  }

  const canSendAnalyze = useMemo(() => jobText.trim().length >= 10, [jobText])

  const resumeSummary = useMemo(() => {
    if (resumeInfo.selectedResumeSource === 'cloudinary') {
      const selected = resumeInfo.cloudinaryResumes.find(
        (item) => item.id === resumeInfo.selectedCloudinaryResumeId
      )
      return selected ? `Using ${selected.name}` : 'No Cloudinary resume selected'
    }
    return resumeInfo.hasResume ? 'Using uploaded resume from device' : 'No resume selected'
  }, [resumeInfo])

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="eyebrow">JD → Email Assistant</p>
        <h1>Paste the job description and send a polished email in one flow.</h1>
        <p className="intro">
          The app reads the job post, drafts a tailored subject and message, lets you edit them, picks a resume, and sends the email with one click.
        </p>
      </header>

      <main className="workspace">
        <section className="panel">
          <h2>Job description</h2>
          <textarea
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste the job description here"
            rows={10}
          />
          <button type="button" onClick={handleAnalyze} disabled={!canSendAnalyze || analysisStatus === 'loading'}>
            {analysisStatus === 'loading' ? 'Analyzing…' : 'Curate email'}
          </button>
          {analysisError && <p className="message error">{analysisError}</p>}
        </section>

        <section className="panel">
          <h2>Email draft</h2>
          <form onSubmit={handleSendMail} className="form-grid">
            <label>
              To
              <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com" />
            </label>
            <label>
              Subject
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Application for Frontend Developer" />
            </label>
            <label>
              Message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={9} />
            </label>

            <div className="resume-card">
              <div className="resume-head">
                <strong>Resume</strong>
                <span>{resumeSummary}</span>
              </div>
              <div className="resume-actions">
                {resumeInfo.hasResume && (
                  <button type="button" className="secondary" onClick={() => handleSelectResume('local')}>
                    Use uploaded resume
                  </button>
                )}
                {resumeInfo.cloudinaryResumes.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={item.id === resumeInfo.selectedCloudinaryResumeId ? 'selected' : 'secondary'}
                    onClick={() => handleSelectResume('cloudinary', item.id)}
                  >
                    {item.name}
                  </button>
                ))}
                <button type="button" className="secondary" onClick={handleDeleteResume}>
                  Clear selection
                </button>
              </div>
              <div className="upload-form">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => handleResumeUpload(e.target.files?.[0])}
                />
              </div>
              {resumeError && <p className="message error">{resumeError}</p>}
              {resumeSelectionError && <p className="message error">{resumeSelectionError}</p>}
            </div>

            <button type="submit" disabled={sendStatus === 'loading'}>
              {sendStatus === 'loading' ? 'Sending…' : 'Send email'}
            </button>
          </form>

          {sendError && <p className="message error">{sendError}</p>}
          {sendSuccess && <p className="message success">{sendSuccess}</p>}
        </section>
      </main>
    </div>
  )
}

export default App
