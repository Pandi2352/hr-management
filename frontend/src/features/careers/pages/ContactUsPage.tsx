import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  EnvelopeSimple,
  Phone,
  MapPin,
  Buildings,
  PaperPlaneTilt,
  CheckCircle,
  Sparkle,
  ArrowLeft,
  Clock,
  ShieldCheck,
} from '@phosphor-icons/react';

export function ContactUsPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    company: '',
    inquiryType: 'Enterprise Cloud & AI Solutions',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.workEmail || !formData.message) return;

    setIsSubmitting(true);
    // Simulate brief network submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      workEmail: '',
      company: '',
      inquiryType: 'Enterprise Cloud & AI Solutions',
      message: '',
    });
    setIsSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Breadcrumb Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 backdrop-blur-md py-3 px-6 sm:px-10 lg:px-16 xl:px-20">
        <div className="w-full flex items-center justify-between text-xs">
          <Link
            to="/careers"
            className="inline-flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Careers & Company Overview</span>
          </Link>
          <div className="text-slate-400 font-mono text-[11px] hidden sm:block">
            NEXORA // CORPORATE COMMS DESK
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-12 lg:py-16 space-y-12">
        {/* Page Header */}
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800/60 uppercase tracking-wider">
            <Sparkle className="h-3.5 w-3.5" />
            Connect With Nexora Technologies
          </div>
          <h1 className="font-outfit text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
            We are here to help scale your enterprise ambitions
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Whether you are exploring our autonomous cloud architectures, inquiring about technical partnerships, or seeking answers from our leadership team, we respond promptly.
          </p>
        </div>

        {/* 2-Column Grid: Image Showcase & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Visual Showcase & Direct Contacts */}
          <div className="lg:col-span-6 space-y-6">
            {/* Visual Image Showcase Card */}
            <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 group">
              <img
                src="/branding/nexora_contact_us.jpg"
                alt="Nexora Technologies Executive Briefing and Communications Center"
                className="w-full h-64 sm:h-72 object-cover group-hover:scale-102 transition-transform duration-500"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent pointer-events-none" />
              
              <div className="absolute top-3 right-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-emerald-300 bg-slate-950/80 backdrop-blur-md border border-emerald-700/60">
                  <span className="h-1.5 w-1.5 rounded-md bg-emerald-400 animate-pulse" />
                  Live Response Desk
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-md bg-slate-900/85 backdrop-blur-md border border-slate-700/70 text-left">
                <div className="text-xs font-bold text-white tracking-wide">
                  Global Executive Briefing & Liaison Center
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Collaborate directly with principal architects and enterprise directors across our worldwide hubs.
                </p>
              </div>
            </div>

            {/* Direct Channel Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
                  <EnvelopeSimple className="h-4 w-4" weight="bold" />
                  <span className="text-xs font-bold uppercase tracking-wider">Enterprise Inquiries</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  contact@nexoratech.com
                </div>
                <div className="text-[11px] text-slate-500">Average response: &lt; 2 hours</div>
              </div>

              <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                  <Phone className="h-4 w-4" weight="bold" />
                  <span className="text-xs font-bold uppercase tracking-wider">Corporate Line</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  +1 (555) 789-2040
                </div>
                <div className="text-[11px] text-slate-500">Mon - Fri, 08:00 - 18:00 PST / GMT</div>
              </div>

              <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Buildings className="h-4 w-4" weight="bold" />
                  <span className="text-xs font-bold uppercase tracking-wider">Talent Acquisition</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  careers@nexoratech.com
                </div>
                <div className="text-[11px] text-slate-500">For candidate questions & resumes</div>
              </div>

              <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-4 w-4" weight="bold" />
                  <span className="text-xs font-bold uppercase tracking-wider">Security & Legal</span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  security@nexoratech.com
                </div>
                <div className="text-[11px] text-slate-500">SOC2 compliance & audit queries</div>
              </div>
            </div>

            {/* SLA Badge */}
            <div className="p-3.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              <Clock className="h-4 w-4 text-violet-500 shrink-0" />
              <span>
                <strong>Enterprise Service Level:</strong> Priority routing is automatically applied to all technical and RFP inquiries.
              </span>
            </div>
          </div>

          {/* Right Column: Interactive Inquiry Form */}
          <div className="lg:col-span-6">
            <div className="p-6 sm:p-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-6">
              {isSubmitted ? (
                <div className="py-12 text-center space-y-4">
                  <div className="h-12 w-12 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center mx-auto">
                    <CheckCircle className="h-6 w-6" weight="fill" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Inquiry Transmitted Successfully
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Thank you, <strong className="text-slate-900 dark:text-white">{formData.fullName}</strong>. Your communication has been dispatched to our technical liaison team. We will review your message and contact you via <strong className="text-slate-900 dark:text-white">{formData.workEmail}</strong> shortly.
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="mt-2 px-4 py-2 rounded-md text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Send an Official Inquiry
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Fill out the details below and our team will get in touch with you.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="e.g. Alex Morgan"
                        className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                      />
                    </div>

                    {/* Work Email */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Work / Corporate Email <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.workEmail}
                        onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                        placeholder="alex@organization.com"
                        className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Company */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Organization / Company
                      </label>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Acme Enterprises"
                        className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                      />
                    </div>

                    {/* Inquiry Type */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Inquiry Category
                      </label>
                      <select
                        value={formData.inquiryType}
                        onChange={(e) => setFormData({ ...formData, inquiryType: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                      >
                        <option value="Enterprise Cloud & AI Solutions">Enterprise Cloud & AI Solutions</option>
                        <option value="Career & Talent Inquiries">Career & Talent Inquiries</option>
                        <option value="Strategic Partnerships">Strategic Partnerships</option>
                        <option value="Press & Media Relations">Press & Media Relations</option>
                        <option value="General Corporate Question">General Corporate Question</option>
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Message & Requirements <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please describe your objective, team size, project scope, or questions..."
                      className="w-full px-3 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-xs sm:text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-md animate-spin" />
                        <span>Transmitting Inquiry...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Corporate Inquiry</span>
                        <PaperPlaneTilt className="h-4 w-4" weight="bold" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400 text-center">
                    Protected by enterprise zero-trust confidentiality. We never share or sell contact data.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Global Hubs Detailed Addresses */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Worldwide Locations
            </span>
            <h2 className="font-outfit text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Executive & Engineering Hubs
            </h2>
            <p className="text-xs text-slate-500">
              Our multidisciplinary teams operate seamlessly across international tech capitals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                city: 'San Francisco',
                type: 'Global HQ & AI Labs',
                zone: 'UTC-7 (Pacific)',
                address: 'Market St & Financial District',
              },
              {
                city: 'London',
                type: 'Europe Technology Center',
                zone: 'UTC+1 (BST)',
                address: 'Canary Wharf & Shoreditch',
              },
              {
                city: 'New York',
                type: 'Enterprise Solutions Hub',
                zone: 'UTC-4 (Eastern)',
                address: 'Midtown Manhattan',
              },
              {
                city: 'Singapore',
                type: 'APAC Operations Core',
                zone: 'UTC+8 (SGT)',
                address: 'Marina Bay Financial Center',
              },
              {
                city: 'Bengaluru',
                type: 'Engineering Innovation Hub',
                zone: 'UTC+5:30 (IST)',
                address: 'Outer Ring Road Tech Park',
              },
            ].map((hub, idx) => (
              <div
                key={idx}
                className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                  <MapPin className="h-3.5 w-3.5 text-violet-500" />
                  <span>{hub.city}</span>
                </div>
                <div className="text-[11px] font-medium text-violet-600 dark:text-violet-400">
                  {hub.type}
                </div>
                <div className="text-[11px] text-slate-500">{hub.address}</div>
                <div className="text-[10px] font-mono text-slate-400">{hub.zone}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
