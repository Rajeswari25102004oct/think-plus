import { useState, useEffect } from 'react';
import api from '../api/axios';
import Toast from '../components/Toast';

export default function StudentDashboard({ onBack }) {
  const [studentName, setStudentName] = useState(() => localStorage.getItem('studentName') || '');
  const [nameInput, setNameInput] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [activeTab, setActiveTab] = useState('assignments');
  const [mySubmissions, setMySubmissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mySubmissions') || '[]'); }
    catch { return []; }
  });
  const [submittingFor, setSubmittingFor] = useState(null);
  const [submitContent, setSubmitContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (studentName) loadAssignments();
  }, [studentName]);

  async function loadAssignments() {
    try {
      const res = await api.get('/assignments');
      setAssignments(res.data.assignments);
    } catch {
      showToast('Failed to load assignments', 'error');
    }
  }

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  function saveName() {
    const name = nameInput.trim();
    if (!name) return;
    setStudentName(name);
    localStorage.setItem('studentName', name);
  }

  async function handleSubmit(assignment) {
    if (!submitContent.trim()) {
      showToast('Please enter your submission content', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/submissions', {
        assignment_id: assignment.assignment_id,
        student_name: studentName,
        content: submitContent,
      });
      const newSub = {
        submission_id: res.data.submission_id,
        assignment_title: assignment.title,
        assignment_id: assignment.assignment_id,
        submitted_at: new Date().toISOString(),
        status: 'pending',
      };
      const updated = [newSub, ...mySubmissions];
      setMySubmissions(updated);
      localStorage.setItem('mySubmissions', JSON.stringify(updated));
      setSubmittingFor(null);
      setSubmitContent('');
      showToast('Submission received! Check "My Submissions" for feedback.');
    } catch (err) {
      showToast(err.response?.data?.error || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function refreshSubmission(submissionId, index) {
    try {
      const res = await api.get(`/submissions/${submissionId}`);
      const updated = [...mySubmissions];
      updated[index] = {
        ...updated[index],
        status: res.data.status,
        feedback: res.data.feedback,
      };
      setMySubmissions(updated);
      localStorage.setItem('mySubmissions', JSON.stringify(updated));
      if (res.data.status === 'evaluated') showToast('Feedback received!');
    } catch {
      showToast('Failed to refresh', 'error');
    }
  }

  if (!studentName) {
    return (
      <div className="dashboard">
        <header className="dashboard-header">
          <button className="btn-back" onClick={onBack}>← Back</button>
          <h1>Student Dashboard</h1>
        </header>
        <div className="name-entry">
          <div className="card name-card">
            <div className="name-card-icon">🎓</div>
            <h2>Enter Your Name</h2>
            <p>Please enter your name to continue</p>
            <div className="input-row">
              <input
                type="text"
                placeholder="Your full name"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveName()}
                autoFocus
              />
              <button className="btn-primary" onClick={saveName}>Continue</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <header className="dashboard-header">
        <button className="btn-back" onClick={onBack}>← Back</button>
        <h1>Student Dashboard</h1>
        <span className="welcome-badge">👤 {studentName}</span>
      </header>

      <div className="tabs">
        <button
          className={`tab${activeTab === 'assignments' ? ' active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          Assignments
          <span className="tab-count">{assignments.length}</span>
        </button>
        <button
          className={`tab${activeTab === 'submissions' ? ' active' : ''}`}
          onClick={() => setActiveTab('submissions')}
        >
          My Submissions
          <span className="tab-count">{mySubmissions.length}</span>
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'assignments' && (
          <div className="cards-list">
            {assignments.length === 0 ? (
              <div className="empty-state">
                <span>📭</span>
                <p>No assignments available yet.</p>
              </div>
            ) : (
              assignments.map(a => (
                <div key={a.assignment_id} className="card assignment-card">
                  <div className="assignment-info">
                    <h3>{a.title}</h3>
                    <p>{a.description}</p>
                    <span className="date-label">Posted {new Date(a.created_at).toLocaleDateString()}</span>
                  </div>

                  {submittingFor === a.assignment_id ? (
                    <div className="submit-form">
                      <textarea
                        placeholder="Type your submission here..."
                        value={submitContent}
                        onChange={e => setSubmitContent(e.target.value)}
                        rows={6}
                      />
                      <div className="form-actions">
                        <button
                          className="btn-secondary"
                          onClick={() => { setSubmittingFor(null); setSubmitContent(''); }}
                        >
                          Cancel
                        </button>
                        <button className="btn-primary" onClick={() => handleSubmit(a)} disabled={loading}>
                          {loading ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn-primary submit-btn" onClick={() => setSubmittingFor(a.assignment_id)}>
                      Submit Assignment
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'submissions' && (
          <div className="cards-list">
            {mySubmissions.length === 0 ? (
              <div className="empty-state">
                <span>📝</span>
                <p>No submissions yet. Go to Assignments to submit your work.</p>
              </div>
            ) : (
              mySubmissions.map((sub, i) => (
                <div key={sub.submission_id} className="card submission-card">
                  <div className="submission-header">
                    <h3>{sub.assignment_title}</h3>
                    <div className="submission-meta">
                      <span className={`status-badge status-${sub.status}`}>{sub.status}</span>
                      {sub.status !== 'evaluated' && (
                        <button className="btn-refresh" onClick={() => refreshSubmission(sub.submission_id, i)}>
                          ↻ Refresh
                        </button>
                      )}
                    </div>
                  </div>
                  <span className="date-label">Submitted {new Date(sub.submitted_at).toLocaleString()}</span>

                  {sub.feedback ? (
                    <div className="feedback-box">
                      <h4>Feedback</h4>
                      <div className="feedback-grid">
                        <div className="feedback-stat">
                          <span className="stat-label">Score</span>
                          <span className="stat-value score-value">{sub.feedback.score}<small>/100</small></span>
                        </div>
                        <div className="feedback-stat">
                          <span className="stat-label">Plagiarism Risk</span>
                          <span className="stat-value">{sub.feedback.plagiarism_risk}</span>
                        </div>
                      </div>
                      <p className="feedback-summary">{sub.feedback.feedback_summary}</p>
                    </div>
                  ) : (
                    sub.status === 'pending' && (
                      <p className="pending-msg">⏳ Your submission is being evaluated. Click Refresh to check.</p>
                    )
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
