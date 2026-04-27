import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../store/AppContext';
import {
  Plus, Edit, Trash2, Eye, Check, X, Award, Copy, Star, StarOff,
  FileText, Code2, ChevronDown, Loader2, Upload, Printer, CloudUpload,
} from 'lucide-react';
import { toast } from 'sonner';

interface CertTemplate {
  id: string;
  name: string;
  categoryTag: string;
  htmlTemplate: string;
  documentFileName?: string;
  documentType?: 'docx' | 'pdf' | 'pptx';
  documentDataUrl?: string; // base64 stored in localStorage for prototype
  previewImageUrl?: string;
  createdAt: string;
  isDefault?: boolean;
}

const SAMPLE_DATA = {
  participant_name: 'Jane Smith',
  participant_email: 'jane@company.com',
  certificate_number: 'EVT-001-ATT-001-20260405',
  event_name: 'Tech Innovation Summit 2026',
  event_date: 'April 5, 2026',
  event_location: 'Grand Convention Center',
  issue_date: new Date().toLocaleDateString(),
};

const PLACEHOLDERS = [
  { token: '{{participant_name}}', desc: "Participant's full name" },
  { token: '{{participant_email}}', desc: "Participant's email" },
  { token: '{{certificate_number}}', desc: 'Unique certificate ID' },
  { token: '{{event_name}}', desc: "Event's title" },
  { token: '{{event_date}}', desc: 'Event date' },
  { token: '{{event_location}}', desc: 'Event venue' },
  { token: '{{issue_date}}', desc: 'Certificate issue date' },
];

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: 'Georgia', serif; margin: 0; padding: 0; background: #f8f9fa; }
  .cert { max-width: 800px; margin: 40px auto; background: white; border: 3px solid #7F77DD; border-radius: 12px; padding: 60px; text-align: center; }
  .cert h1 { font-size: 36px; color: #2a2550; margin-bottom: 8px; letter-spacing: 2px; }
  .cert .subtitle { font-size: 14px; color: #7F77DD; text-transform: uppercase; letter-spacing: 4px; margin-bottom: 40px; }
  .cert .name { font-size: 28px; color: #0F1E30; font-weight: bold; border-bottom: 2px solid #7F77DD; display: inline-block; padding-bottom: 8px; margin: 20px 0; }
  .cert p { font-size: 14px; color: #4A6080; line-height: 1.8; }
  .cert .details { margin-top: 30px; font-size: 12px; color: #98ABBE; }
  .cert .number { font-family: monospace; background: #F5F0FC; padding: 4px 12px; border-radius: 4px; font-size: 11px; }
</style>
</head>
<body>
<div class="cert">
  <h1>CERTIFICATE</h1>
  <div class="subtitle">of Participation</div>
  <p>This certifies that</p>
  <div class="name">{{participant_name}}</div>
  <p>has successfully participated in</p>
  <p style="font-size:18px; color:#0F1E30; font-weight:bold; margin:16px 0;">{{event_name}}</p>
  <p>held on {{event_date}} at {{event_location}}</p>
  <div class="details">
    <p>Certificate No: <span class="number">{{certificate_number}}</span></p>
    <p>Issued: {{issue_date}}</p>
  </div>
</div>
</body>
</html>`;

const STORAGE_KEY = 'em_certificates';

function loadTemplates(): CertTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveTemplates(templates: CertTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function resolveTemplate(html: string, data: Record<string, string> = SAMPLE_DATA) {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || `{{${key}}}`);
}

export function CertificatesPage() {
  const { state } = useApp();
  const [templates, setTemplates] = useState<CertTemplate[]>(loadTemplates);
  const [editModal, setEditModal] = useState(false);
  const [previewModal, setPreviewModal] = useState<CertTemplate | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formHtml, setFormHtml] = useState(DEFAULT_TEMPLATE);
  const [formDocFile, setFormDocFile] = useState<{ name: string; type: string; dataUrl: string } | null>(null);
  const [formPreviewImage, setFormPreviewImage] = useState<string>('');
  const [editorMode, setEditorMode] = useState<'html' | 'document'>('document');
  const [allCopied, setAllCopied] = useState(false);
  const previewRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<any>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => { saveTemplates(templates); }, [templates]);

  // Live preview with debounce
  useEffect(() => {
    if (!editModal) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPreviewHtml(resolveTemplate(formHtml));
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [formHtml, editModal]);

  const openNew = () => {
    setEditId(null);
    setFormName('');
    setFormCategory('');
    setFormHtml(DEFAULT_TEMPLATE);
    setFormDocFile(null);
    setFormPreviewImage('');
    setEditorMode('document');
    setAllCopied(false);
    setEditModal(true);
  };

  const openEdit = (t: CertTemplate) => {
    setEditId(t.id);
    setFormName(t.name);
    setFormCategory(t.categoryTag);
    setFormHtml(t.htmlTemplate);
    setFormDocFile(t.documentDataUrl ? { name: t.documentFileName || '', type: t.documentType || '', dataUrl: t.documentDataUrl } : null);
    setFormPreviewImage(t.previewImageUrl || '');
    setEditorMode(t.documentDataUrl ? 'document' : 'html');
    setAllCopied(false);
    setEditModal(true);
  };

  const handleSave = () => {
    if (!formName.trim()) { toast.error('Template name is required'); return; }
    if (editId) {
      setTemplates(ts => ts.map(t => t.id === editId ? { ...t, name: formName, categoryTag: formCategory, htmlTemplate: formHtml, documentFileName: formDocFile?.name, documentType: formDocFile?.type as 'docx' | 'pdf' | 'pptx', documentDataUrl: formDocFile?.dataUrl, previewImageUrl: formPreviewImage } : t));
      toast.success('Template updated');
    } else {
      const newT: CertTemplate = {
        id: `cert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: formName,
        categoryTag: formCategory,
        htmlTemplate: formHtml,
        documentFileName: formDocFile?.name,
        documentType: formDocFile?.type as 'docx' | 'pdf' | 'pptx',
        documentDataUrl: formDocFile?.dataUrl,
        previewImageUrl: formPreviewImage,
        createdAt: new Date().toISOString(),
      };
      setTemplates(ts => [...ts, newT]);
      toast.success('Template created');
    }
    setEditModal(false);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this template?')) return;
    setTemplates(ts => ts.filter(t => t.id !== id));
    toast.success('Template deleted');
  };

  const handleSetDefault = (id: string) => {
    setTemplates(ts => ts.map(t => ({ ...t, isDefault: t.id === id })));
    toast.success('Default template set');
  };

  const cardStyle = { background: 'var(--surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' };

  const categories = ['conference', 'workshop', 'meetup', 'webinar', 'social', 'other'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-up">
        <div>
          <h1 style={{ color: 'var(--text)' }}>Certificate Templates</h1>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-sec)' }}>
            Create and manage reusable certificate templates for your events
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-[13px] rounded-[var(--radius-md)] font-semibold transition-all hover:-translate-y-px"
          style={{ background: 'var(--bs-600)', boxShadow: 'var(--shadow-btn)', fontFamily: 'var(--font-display)' }}
        >
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div className="animate-fade-up py-20 text-center" style={cardStyle}>
          <Award className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--text-dim)' }} />
          <p className="text-[14px] font-bold mb-1" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)' }}>No templates yet</p>
          <p className="text-[12px] mb-5" style={{ color: 'var(--text-dim)' }}>Create your first certificate template to get started</p>
          <button
            onClick={openNew}
            className="px-5 py-2.5 text-white text-[13px] rounded-[var(--radius-md)] font-semibold transition-all hover:-translate-y-px"
            style={{ background: 'var(--bs-600)', boxShadow: 'var(--shadow-btn)', fontFamily: 'var(--font-display)' }}
          >
            <Plus className="w-4 h-4 inline mr-1.5" /> Create Template
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t, i) => (
            <div
              key={t.id}
              className="overflow-hidden transition-all hover:-translate-y-0.5 animate-fade-up"
              style={{ ...cardStyle, animationDelay: `${i * 0.05}s` }}
            >
              {/* Preview thumbnail */}
              <div className="relative h-40 overflow-hidden" style={{ background: 'var(--surface2)' }}>
                <iframe
                  srcDoc={resolveTemplate(t.htmlTemplate)}
                  className="w-[400%] h-[400%] origin-top-left pointer-events-none"
                  style={{ transform: 'scale(0.25)', border: 'none' }}
                  title={t.name}
                />
                {t.isDefault && (
                  <span
                    className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold text-white"
                    style={{ background: 'var(--bs-600)' }}
                  >
                    <Star className="w-3 h-3" /> Default
                  </span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-[14px] font-bold truncate" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{t.name}</h3>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {t.categoryTag && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase capitalize" style={{ background: 'rgba(127,119,221,0.1)', color: 'var(--bs-600)' }}>
                      {t.categoryTag}
                    </span>
                  )}
                  {t.documentType && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: 'var(--surface2)', color: 'var(--text-dim)' }}>
                      {t.documentType}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-3">
                  <button onClick={() => setPreviewModal(t)} className="p-1.5 rounded-[var(--radius-sm)] transition-all hover:bg-black/5 dark:hover:bg-white/10" style={{ color: 'var(--text-sec)' }} title="Preview">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button onClick={() => openEdit(t)} className="p-1.5 rounded-[var(--radius-sm)] transition-all hover:bg-black/5 dark:hover:bg-white/10" style={{ color: 'var(--text-sec)' }} title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleSetDefault(t.id)} className="p-1.5 rounded-[var(--radius-sm)] transition-all hover:bg-black/5 dark:hover:bg-white/10" style={{ color: t.isDefault ? 'var(--amber)' : 'var(--text-dim)' }} title="Set as default">
                    {t.isDefault ? <Star className="w-4 h-4" /> : <StarOff className="w-4 h-4" />}
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 rounded-[var(--radius-sm)] transition-all hover:bg-[var(--red-soft)]" style={{ color: 'var(--red-text)' }} title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit/Create Modal ──────────────────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-6xl max-h-[90vh] flex flex-col animate-fade-up"
            style={{ ...cardStyle, boxShadow: 'var(--shadow-float)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {editId ? 'Edit Template' : 'Create Template'}
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handleSave} className="flex items-center gap-1.5 px-4 py-2 text-white text-[13px] rounded-[var(--radius-md)] font-semibold transition-all hover:-translate-y-px" style={{ background: 'var(--bs-600)', boxShadow: 'var(--shadow-btn)', fontFamily: 'var(--font-display)' }}>
                  <Check className="w-4 h-4" /> Save Template
                </button>
                <button onClick={() => setEditModal(false)} className="p-2 rounded-[var(--radius-sm)] transition-all hover:bg-black/5 dark:hover:bg-white/10" style={{ color: 'var(--text-sec)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Builder */}
              <div className="flex-1 flex flex-col overflow-hidden" style={{ borderRight: '1px solid var(--border)' }}>
                <div className="px-6 py-4 space-y-3 shrink-0">
                  <div>
                    <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Template Name</label>
                    <input
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Tech Conference Certificate"
                      className="w-full px-3 py-2 text-[13px] rounded-[var(--radius-sm)]"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Category Tag (Optional)</label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      className="w-full px-3 py-2 text-[13px] rounded-[var(--radius-sm)] capitalize"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      <option value="">None</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Mode toggle */}
                  <div>
                    <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Template Source</label>
                    <div className="flex p-0.5 rounded-[var(--radius-sm)]" style={{ background: 'var(--surface2)' }}>
                      {[
                        { id: 'document' as const, label: 'Document Upload', icon: Upload },
                        { id: 'html' as const, label: 'HTML Editor', icon: Code2 },
                      ].map(m => (
                        <button key={m.id} onClick={() => setEditorMode(m.id)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-[6px] transition-all" style={{ background: editorMode === m.id ? 'var(--surface)' : 'transparent', color: editorMode === m.id ? 'var(--text)' : 'var(--text-dim)', boxShadow: editorMode === m.id ? 'var(--shadow-card)' : 'none', fontFamily: 'var(--font-display)' }}>
                          <m.icon className="w-3.5 h-3.5" /> {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Document upload mode */}
                {editorMode === 'document' && (
                  <div className="flex-1 px-6 pb-4 overflow-y-auto space-y-4">
                    <div
                      className="border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center cursor-pointer transition-all hover:border-[var(--bs-600)]"
                      style={{ borderColor: formDocFile ? 'var(--ad-400)' : 'var(--border)', background: formDocFile ? 'rgba(29,158,117,0.04)' : 'var(--surface2)' }}
                      onClick={() => docInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--bs-600)'; }}
                      onDragLeave={e => { e.currentTarget.style.borderColor = formDocFile ? 'var(--ad-400)' : 'var(--border)'; }}
                      onDrop={e => {
                        e.preventDefault();
                        const file = e.dataTransfer.files[0];
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (!['docx','pdf','pptx'].includes(ext || '')) { toast.error('Only .docx, .pdf, .pptx accepted'); return; }
                          const reader = new FileReader();
                          reader.onload = ev => setFormDocFile({ name: file.name, type: ext || '', dataUrl: ev.target?.result as string });
                          reader.readAsDataURL(file);
                        }
                      }}
                    >
                      <input ref={docInputRef} type="file" accept=".docx,.pdf,.pptx" className="hidden" onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          const reader = new FileReader();
                          reader.onload = ev => setFormDocFile({ name: file.name, type: ext || '', dataUrl: ev.target?.result as string });
                          reader.readAsDataURL(file);
                        }
                      }} />
                      {formDocFile ? (
                        <div className="space-y-2">
                          <FileText className="w-10 h-10 mx-auto" style={{ color: 'var(--ad-400)' }} />
                          <p className="text-[13px] font-bold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{formDocFile.name}</p>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: 'rgba(29,158,117,0.12)', color: 'var(--ad-400)' }}>{formDocFile.type}</span>
                          <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>Click or drag to replace</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <CloudUpload className="w-10 h-10 mx-auto" style={{ color: 'var(--text-dim)' }} />
                          <p className="text-[13px] font-semibold" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)' }}>Drag and drop your template file here</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-dim)' }}>or click to browse</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-dim)' }}>Accepted formats: .docx, .pdf, .pptx</p>
                        </div>
                      )}
                    </div>

                    {/* Preview thumbnail upload */}
                    <div>
                      <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Preview Thumbnail (Optional)</label>
                      <div className="flex items-center gap-3">
                        {formPreviewImage && <img src={formPreviewImage} alt="Preview" className="w-16 h-16 object-cover rounded-[var(--radius-sm)]" style={{ border: '1px solid var(--border)' }} />}
                        <button onClick={() => thumbnailInputRef.current?.click()} className="px-3 py-2 text-[12px] rounded-[var(--radius-sm)] transition-all" style={{ border: '1px solid var(--border)', color: 'var(--text-sec)' }}>
                          <Upload className="w-3.5 h-3.5 inline mr-1" /> {formPreviewImage ? 'Change' : 'Upload'} Image
                        </button>
                        <input ref={thumbnailInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) { toast.error('Max 2MB'); return; }
                            const reader = new FileReader();
                            reader.onload = ev => setFormPreviewImage(ev.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* HTML editor mode */}
                {editorMode === 'html' && (
                <div className="flex-1 px-6 pb-4 overflow-hidden flex flex-col">
                  <label className="block mb-1.5" style={{ color: 'var(--text-sec)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    <Code2 className="w-3 h-3 inline mr-1" /> HTML Template
                  </label>
                  <textarea
                    value={formHtml}
                    onChange={e => setFormHtml(e.target.value)}
                    className="flex-1 w-full px-4 py-3 text-[12px] font-mono rounded-[var(--radius-md)] resize-none"
                    style={{ background: 'var(--ad-950)', color: 'var(--ad-200)', border: '1px solid var(--border)' }}
                    spellCheck={false}
                  />
                </div>
                )}
                {/* Placeholder reference */}
                <div className="px-6 py-3 shrink-0" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>Placeholder Tokens</p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(PLACEHOLDERS.map(p => p.token).join('\n'));
                        setAllCopied(true);
                        setTimeout(() => setAllCopied(false), 2000);
                        toast.success('All tokens copied');
                      }}
                      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold transition-all hover:opacity-80"
                      style={{ background: allCopied ? 'rgba(29,158,117,0.1)' : 'rgba(127,119,221,0.08)', color: allCopied ? 'var(--ad-400)' : 'var(--bs-600)', fontFamily: 'var(--font-display)' }}
                    >
                      {allCopied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy All</>}
                    </button>
                  </div>
                  <p className="text-[10px] mb-2" style={{ color: 'var(--text-dim)' }}>Insert these tokens into your document as plain text where participant data should appear.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDERS.map(p => (
                      <button
                        key={p.token}
                        onClick={() => {
                          if (editorMode === 'html') {
                            setFormHtml(h => h + p.token);
                            toast.success(`Inserted ${p.token}`);
                          } else {
                            navigator.clipboard.writeText(p.token);
                            toast.success(`Copied ${p.token}`);
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all hover:opacity-80"
                        style={{ background: 'rgba(127,119,221,0.1)', color: 'var(--bs-600)' }}
                        title={p.desc}
                      >
                        {p.token} <Copy className="w-2.5 h-2.5 opacity-50" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Live Preview */}
              <div className="w-1/2 flex flex-col">
                <div className="px-4 py-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-[0.8px]" style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-display)' }}>
                    <Eye className="w-3 h-3 inline mr-1" /> Live Preview
                  </p>
                </div>
                <div className="flex-1 overflow-auto p-4" style={{ background: 'var(--surface2)' }}>
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full rounded-[var(--radius-md)]"
                    style={{ border: '1px solid var(--border)', background: '#fff', minHeight: 400 }}
                    title="preview"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Preview Modal ─────────────────────────────────────── */}
      {previewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-4xl max-h-[85vh] flex flex-col animate-fade-up"
            style={{ ...cardStyle, boxShadow: 'var(--shadow-float)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-[18px] font-extrabold" style={{ color: 'var(--text)', fontFamily: 'var(--font-display)' }}>
                {previewModal.name}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(resolveTemplate(previewModal.htmlTemplate));
                      printWindow.document.close();
                      setTimeout(() => printWindow.print(), 500);
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-[var(--radius-sm)] font-semibold transition-all hover:-translate-y-px"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-sec)', fontFamily: 'var(--font-display)' }}
                >
                  <Printer className="w-3.5 h-3.5" /> Print Preview
                </button>
                <button onClick={() => setPreviewModal(null)} className="p-2 rounded-[var(--radius-sm)] transition-all hover:bg-black/5 dark:hover:bg-white/10" style={{ color: 'var(--text-sec)' }}>
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6" style={{ background: 'var(--surface2)' }}>
              <iframe
                srcDoc={resolveTemplate(previewModal.htmlTemplate)}
                className="w-full rounded-[var(--radius-md)]"
                style={{ border: '1px solid var(--border)', background: '#fff', minHeight: 600, height: '100%' }}
                title="full-preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}