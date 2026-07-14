import { useEffect, useMemo, useRef, useState } from 'react'
import {
  analyzeJob,
  analyzeJobFromImage,
  sendMail,
  uploadResume,
  getResume,
  selectResume,
  deleteResume,
} from './services/api'
import './App.css'

function App() {
  // ── JD state ──────────────────────────────────────────────
  const [jobText, setJobText] = useState('')
  const [jdImage, setJdImage] = useState(null)
  const [jdImagePreview, setJdImagePreview] = useState(null)
  const [jdInputMode, setJdInputMode] = useState('text') // 'text' | 'image'
  const [analysisStatus, setAnalysisStatus] = useState('idle')
  const [analysisError, setAnalysisError] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const imageInputRef = useRef(null)

  // ── Email draft state ──────────────────────────────────────
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sendStatus, setSendStatus] = useState('idle')
  const [sendError, setSendError] = useState('')
  const [sendSuccess, setSendSuccess] = useState('')

  // ── Resume state ───────────────────────────────────────────
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

  useEffect(() => { fetchResumeInfo() }, [])

  // ── Helpers ────────────────────────────────────────────────
  const fetchResumeInfo = async () => {
    setResumeStatus('loading')
    setResumeError('')
    try {
      const response = await getResume()
      setResumeInfo(response.data || { hasResume: false, path: null, selectedResumeSource: 'local', selectedCloudinaryResumeId: null, cloudinaryResumes: [] })
      setResumeStatus('success')
    } catch (err) {
      setResumeStatus('error')
      setResumeError(err?.response?.data?.error || err.message || 'Unable to load resume info')
    }
  }

  const applyAnalysisResult = (data) => {
    setAnalysis(data)
    setAnalysisStatus('success')
    setAnalysisError('')
    setTo(data.email || '')
    setSubject(data.subject || '')
    setMessage(data.mail || '')
  }

  // ── Analyze from text ──────────────────────────────────────
  const handleAnalyze = async () => {
    setAnalysisError('')
    setAnalysisStatus('loading')
    setAnalysis(null)
    try {
      const response = await analyzeJob(jobText)
      applyAnalysisResult(response.data)
    } catch (err) {
      setAnalysisStatus('error')
      setAnalysisError(err?.response?.data?.error || err.message || 'Failed to analyze job description')
    }
  }

  // ── Analyze from image ─────────────────────────────────────
  const handleJdImageChange = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAnalysisError('Please upload an image file (JPG, PNG, WEBP).')
      return
    }
    setJdImage(file)
    setJdImagePreview(URL.createObjectURL(file))
    setAnalysisError('')
  }

  const handleAnalyzeImage = async () => {
    if (!jdImage) return
    setAnalysisError('')
    setAnalysisStatus('loading')
    setAnalysis(null)
    try {
      const formData = new FormData()
      formData.append('jdImage', jdImage)
      const response = await analyzeJobFromImage(formData)
      if (response.data.extractedText) {
        setJobText(response.data.extractedText)
      }
      applyAnalysisResult(response.data)
    } catch (err) {
      setAnalysisStatus('error')
      setAnalysisError(err?.response?.data?.error || err.message || 'Failed to extract job description from image')
    }
  }

  const clearJdImage = () => {
    setJdImage(null)
    setJdImagePreview(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  // ── Send mail ──────────────────────────────────────────────
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
      await sendMail({ to, subject, text: message, attachResume, company: analysis?.company, role: analysis?.role })
      setSendStatus('success')
      setSendSuccess('Email sent successfully.')
    } catch (err) {
      setSendStatus('error')
      setSendError(err?.response?.data?.error || err.message || 'Failed to send email')
    }
  }

  // ── Resume upload ──────────────────────────────────────────
  const handleResumeUpload = async (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setResumeError('Only PDF resumes are accepted.')
      return
    }
    setResumeStatus('loading')
    setResumeError('')
    try {
      const formData = new FormData()
      formData.append('resume', file)
      await uploadResume(formData)
      await fetchResumeInfo()
      setResumeStatus('success')
    } catch (err) {
      setResumeStatus('error')
      setResumeError(err?.response?.data?.error || err.message || 'Resume upload failed')
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

  // ── Derived ────────────────────────────────────────────────
  const canAnalyzeText = useMemo(() => jobText.trim().length >= 10, [jobText])
  const canAnalyzeImage = useMemo(() => Boolean(jdImage), [jdImage])

  const resumeSummary = useMemo(() => {
    if (resumeInfo.selectedResumeSource === 'cloudinary') {
      const selected = resumeInfo.cloudinaryResumes.find(r => r.id === resumeInfo.selectedCloudinaryResumeId)
      return selected ? `Using ${selected.name}` : 'No Cloudinary resume selected'
    }
    return resumeInfo.hasResume ? 'Using uploaded resume' : 'No resume selected'
  }, [resumeInfo])

  const isAnalyzing = analysisStatus === 'loading'

  return (
    <div className="app-shell">
      {/* ── Slim header ── */}
      <header className="app-header">
        <span className="app-logo">✦</span>
        <span className="app-title">Applier</span>
        <span className="app-subtitle">Paste or snap a JD → get a polished email in seconds</span>
      </header>

      <main className="workspace">
        {/* ── JD panel ── */}
        <section className="panel">
          <div className="panel-header-row">
            <h2>Job description</h2>
            <div className="tab-toggle">
              <button
                type="button"
                className={jdInputMode === 'text' ? 'tab active' : 'tab'}
                onClick={() => setJdInputMode('text')}
              >
                Paste text
              </button>
              <button
                type="button"
                className={jdInputMode === 'image' ? 'tab active' : 'tab'}
                onClick={() => setJdInputMode('image')}
              >
                Upload image
              </button>
            </div>
          </div>

          {jdInputMode === 'text' ? (
            <>
              <textarea
                value={jobText}
                onChange={(e) => setJobText(e.target.value)}
                placeholder="Paste the full job description here…"
                rows={10}
              />
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!canAnalyzeText || isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing…' : 'Curate email'}
              </button>
            </>
          ) : (
            <>
              <div
                className="image-drop-zone"
                onClick={() => imageInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleJdImageChange(e.dataTransfer.files?.[0]) }}
              >
                {jdImagePreview ? (
                  <img src={jdImagePreview} alt="JD preview" className="jd-preview-img" />
                ) : (
                  <div className="drop-placeholder">
                    <span className="drop-icon">🖼️</span>
                    <span>Click or drag a screenshot of the job post</span>
                    <span className="drop-hint">JPG, PNG, WEBP · max 10 MB</span>
                  </div>
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden-input"
                onChange={(e) => handleJdImageChange(e.target.files?.[0])}
              />
              {jdImage && (
                <div className="image-file-row">
                  <span className="image-file-name">{jdImage.name}</span>
                  <button type="button" className="ghost-btn" onClick={clearJdImage}>✕ Remove</button>
                </div>
              )}
              <button
                type="button"
                onClick={handleAnalyzeImage}
                disabled={!canAnalyzeImage || isAnalyzing}
              >
                {isAnalyzing ? 'Extracting & analyzing…' : 'Extract JD & curate email'}
              </button>
            </>
          )}

          {analysisError && <p className="message error">{analysisError}</p>}

          {analysis && (
            <div className="analysis-chip-row">
              {analysis.company && <span className="chip">{analysis.company}</span>}
              {analysis.role && <span className="chip">{analysis.role}</span>}
            </div>
          )}
        </section>

        {/* ── Email draft panel ── */}
        <section className="panel">
          <h2>Email draft</h2>
          <form onSubmit={handleSendMail} className="form-grid">
            <label>
              To
              <div className="input-with-badge">
                <input
                  type="email"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@company.com"
                />
                {analysis?.email && analysis.email === to && (
                  <span className="auto-badge">auto-filled</span>
                )}
              </div>
            </label>
            <label>
              Subject
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Application for Frontend Developer"
              />
            </label>
            <label>
              Message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={9} />
            </label>

            {/* Resume card */}
            <div className="resume-card">
              <div className="resume-head">
                <strong>Resume</strong>
                <span className="resume-summary">{resumeSummary}</span>
              </div>
              <div className="resume-actions">
                {resumeInfo.hasResume && (
                  <button type="button" className="secondary" onClick={() => handleSelectResume('local')}>
                    Use uploaded
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
                  Clear
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
