import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  MagnifyingGlass,
  ArrowDown,
  Sparkle,
  Heart,
  Laptop,
  BookOpen,
  Airplane,
  TrendUp,
  Users,
  Compass,
  CheckCircle,
  CloudCheck,
  Code,
  ChartLineUp,
  ShieldCheck,
  MapPin,
  EnvelopeSimple,
  Phone,
} from '@phosphor-icons/react';
import { JobCard } from '../components/JobCard';
import { JobDetailModal } from '../components/JobDetailModal';
import { ApplicationModal } from '../components/ApplicationModal';
import { GlobalScaleSection } from '../components/GlobalScaleSection';
import { RadarMotif } from '../components/RadarMotif';
import { AuroraMotif, GridDriftMotif, MoteFieldMotif, WaveMotif } from '../components/motifs';
import { Reveal } from '../components/Reveal';
import {
  CLIP_CHAMFER,
  CLIP_CHEVRON,
  CLIP_HERO,
  CLIP_SLICE,
  CLIP_TAB,
  CLIP_WEDGE,
} from '../components/sectionShapes';
import { careersApi } from '../api/careers.api';
import type { PublicCompanyInfo, PublicJobItem } from '../types/careers.types';

export function CareersPage() {
  const { jobId } = useParams<{ jobId?: string }>();

  const [companyInfo, setCompanyInfo] = useState<PublicCompanyInfo | null>(null);
  const [jobs, setJobs] = useState<PublicJobItem[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');

  // Modals state
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<PublicJobItem | null>(null);
  const [selectedJobForApply, setSelectedJobForApply] = useState<PublicJobItem | null>(null);

  // Animated About Showcase Gallery State
  const [aboutActiveIndex, setAboutActiveIndex] = useState(0);
  const [isAboutAutoPlaying, setIsAboutAutoPlaying] = useState(true);

  const aboutShowcases = useMemo(
    () => [
      {
        id: 'labs',
        label: 'Neural Labs',
        title: 'Nexora Neural Engineering Labs',
        subtitle: 'Deep Multimodal Models & Autonomous Agents',
        badge: 'Active AI Research Core',
        badgeColor: 'text-emerald-400 border-emerald-800/60 bg-emerald-950/80',
        dotColor: 'bg-emerald-400',
        description:
          'Architecting deep enterprise models, multimodal reasoning engines, and autonomous agent swarms with continuous self-refining validation loops.',
        image: '/branding/nexora_about_company.jpg',
        metric: '99.8% Precision',
        telemetry: 'ONLINE • MODEL V4.8',
      },
      {
        id: 'quantum',
        label: 'Quantum Core',
        title: 'Cryogenic Supercomputing Core',
        subtitle: 'High-Density Tensor Acceleration Cluster',
        badge: 'Cryogenic Supercluster',
        badgeColor: 'text-cyan-400 border-cyan-800/60 bg-cyan-950/80',
        dotColor: 'bg-cyan-400',
        description:
          'Massive cylindrical quantum & tensor processors delivering 4.8 TB/s real-time streaming bandwidth with sub-millisecond latencies.',
        image: '/branding/nexora_quantum_core.jpg',
        metric: '4.8 TB/s Throughput',
        telemetry: 'LATENCY <0.8ms • 0 FAULT',
      },
      {
        id: 'culture',
        label: 'Global Team',
        title: 'Global Engineering & Collaborative Culture',
        subtitle: 'Distributed Engineering Across 4 Continents',
        badge: 'Distributed Elite',
        badgeColor: 'text-violet-400 border-violet-800/60 bg-violet-950/80',
        dotColor: 'bg-violet-400',
        description:
          'A multidisciplinary team of 140+ elite systems engineers, ML researchers, and designers collaborating synchronously across global timezones.',
        image: '/branding/nexora_culture_life.jpg',
        metric: '140+ Researchers',
        telemetry: 'SYNCED • SF • LON • SGP • BLR',
      },
      {
        id: 'mesh',
        label: 'Global Mesh',
        title: 'Planetary Enterprise Edge Mesh',
        subtitle: 'Global Low-Latency Distributed Fabric',
        badge: 'Planetary Mesh',
        badgeColor: 'text-indigo-400 border-indigo-800/60 bg-indigo-950/80',
        dotColor: 'bg-indigo-400',
        description:
          'Mission-critical distributed mesh architecture spanning 24 worldwide data hubs ensuring 99.999% high-availability enterprise SLA.',
        image: '/branding/nexora_global_network.jpg',
        metric: '24 Edge Regions',
        telemetry: '99.999% SLA • ENCRYPTED',
      },
      {
        id: 'solutions',
        label: 'Autonomous Systems',
        title: 'Autonomous Intelligence Engine',
        subtitle: 'Adaptive Enterprise Workflow Orchestration',
        badge: 'Autonomous Systems',
        badgeColor: 'text-amber-400 border-amber-800/60 bg-amber-950/80',
        dotColor: 'bg-amber-400',
        description:
          'Self-healing workflow pipelines that detect operational bottlenecks and orchestrate real-time resolution at machine speed.',
        image: '/branding/nexora_solutions_showcase.jpg',
        metric: '3.2M Ops/Sec',
        telemetry: 'AUTOPILOT • ZERO LAG',
      },
    ],
    []
  );

  useEffect(() => {
    if (!isAboutAutoPlaying) return;
    const timer = setInterval(() => {
      setAboutActiveIndex((prev) => (prev + 1) % aboutShowcases.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isAboutAutoPlaying, aboutShowcases.length]);

  useEffect(() => {
    async function loadCompanyData() {
      try {
        setIsLoading(true);
        const [companyRes, jobsRes] = await Promise.allSettled([
          careersApi.getCompanyOverview(),
          careersApi.getPublicJobs(),
        ]);

        if (companyRes.status === 'fulfilled') {
          setCompanyInfo(companyRes.value);
        }

        if (jobsRes.status === 'fulfilled') {
          const jobData = jobsRes.value;
          setJobs(jobData.jobs || []);
          setDepartments(jobData.availableDepartments || []);
          setLocations(jobData.availableLocations || []);

          if (jobId) {
            const matched = jobData.jobs.find((j) => j._id === jobId);
            if (matched) setSelectedJobForDetail(matched);
          }
        }
      } catch (err) {
        console.error('Failed to load company and careers data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCompanyData();
  }, [jobId]);

  // Filtered job openings
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchSearch =
        !searchQuery.trim() ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.overview.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDept =
        selectedDept === 'ALL' || job.department.toLowerCase() === selectedDept.toLowerCase();

      const matchLoc =
        selectedLocation === 'ALL' ||
        job.location.toLowerCase().includes(selectedLocation.toLowerCase());

      return matchSearch && matchDept && matchLoc;
    });
  }, [jobs, searchQuery, selectedDept, selectedLocation]);

  const companyName = companyInfo?.companyName || 'Nexora Technologies';

  const perkIcons: Record<string, React.ReactNode> = {
    Heart: <Heart className="h-5 w-5 text-rose-500" weight="duotone" />,
    Laptop: <Laptop className="h-5 w-5 text-violet-500" weight="duotone" />,
    BookOpen: <BookOpen className="h-5 w-5 text-blue-500" weight="duotone" />,
    Plane: <Airplane className="h-5 w-5 text-amber-500" weight="duotone" />,
    TrendUp: <TrendUp className="h-5 w-5 text-emerald-500" weight="duotone" />,
    Sparkles: <Sparkle className="h-5 w-5 text-purple-500" weight="duotone" />,
  };

  const renderSolutionIcon = (index: number) => {
    switch (index % 4) {
      case 0:
        return <CloudCheck className="h-6 w-6 text-violet-500" weight="duotone" />;
      case 1:
        return <Code className="h-6 w-6 text-indigo-500" weight="duotone" />;
      case 2:
        return <ChartLineUp className="h-6 w-6 text-emerald-500" weight="duotone" />;
      case 3:
      default:
        return <ShieldCheck className="h-6 w-6 text-blue-500" weight="duotone" />;
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="w-full">
      {/* 1. HERO SECTION - FULL-WIDTH PANORAMIC ROBOT BOUND WITH BG */}
      <section
        className="relative overflow-hidden bg-slate-950 text-white min-h-[640px] lg:min-h-[740px] flex items-center"
        style={{ clipPath: CLIP_HERO }}
      >
        {/* Full-width Panoramic Background Image (Pinned to TOP so rings & head are fully visible below navbar) */}
        <div className="absolute inset-0 z-0">
          <img
            src="/branding/nexora_robot_panoramic_hero.jpg"
            alt="Nexora Autonomous AI Entity & Quantum Command"
            className="w-full h-full object-cover object-[82%_top] lg:object-[right_top]"
            loading="eager"
          />
          {/* Seamless gradient masks: melts into dark obsidian background on the left so text is 100% crisp */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-transparent lg:via-slate-950/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        </div>

        {/* Content Container - FULL WIDTH WITH BALANCED EDGE PADDING */}
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-20 py-16 lg:py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left 7 Columns: Typography, Story, CTAs, Metrics */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-900/90 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-md bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-md h-2 w-2 bg-cyan-500" />
                </span>
                <span className="font-outfit tracking-wider uppercase text-[10px] font-bold">
                  Autonomous Enterprise Intelligence
                </span>
              </div>

              <h1 className="font-outfit text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.08]">
                Revealing the{' '}
                <span className="bg-linear-to-r from-violet-400 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  Future of AI
                </span>{' '}
                & Enterprise Systems
              </h1>

              <p className="font-jakarta text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl font-normal">
                "We believe high-velocity organizations thrive when powered by autonomous cognitive architectures, self-orchestrating cloud infrastructure, and world-class engineers. Come build the intelligent systems shaping tomorrow."
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => scrollToSection('open-roles')}
                  className="font-outfit inline-flex items-center gap-2 px-6 py-3 rounded-md text-xs sm:text-sm font-bold text-white bg-linear-to-r from-violet-600 via-indigo-600 to-purple-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 transition-all border border-violet-400/30 cursor-pointer"
                >
                  <span>Explore {jobs.length} Open Roles</span>
                  <ArrowDown className="h-4 w-4" weight="bold" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('about')}
                  className="font-outfit inline-flex items-center gap-2 px-5 py-3 rounded-md text-xs sm:text-sm font-semibold text-slate-200 bg-slate-900/90 backdrop-blur-md border border-slate-700 hover:bg-slate-800 hover:border-violet-500/50 transition-all cursor-pointer"
                >
                  Our Story & Solutions
                </button>
              </div>

              {/* Quick Metrics Bar */}
              <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl">
                {(companyInfo?.stats || [
                  { label: 'Global Team Members', value: '140+', change: '+38% YoY' },
                  { label: 'Countries Represented', value: '24', change: 'Global Remote' },
                  { label: 'Enterprise Retention', value: '99.4%', change: 'Top Tier' },
                  { label: 'Glassdoor Rating', value: '4.9 ★', change: 'Top Rated' },
                ]).map((stat, i) => (
                  <div key={i} className="p-3 rounded-md border border-slate-800/80 bg-slate-950/75 backdrop-blur-md">
                    <div className="font-outfit text-lg font-black text-white">{stat.value}</div>
                    <div className="font-jakarta text-[11px] font-semibold text-slate-400 truncate">{stat.label}</div>
                    <div className="font-jakarta text-[10px] font-medium text-emerald-400">{stat.change}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right 5 Columns: Completely clean, unobstructed view of the AI Robot and Quantum Chamber */}
            <div className="lg:col-span-5 relative hidden lg:block" />
          </div>
        </div>
      </section>

      {/* 2. ABOUT OUR COMPANY & STORY - WITH QUANTUM FACILITY BACKGROUND */}
      <section id="about" className="relative w-full py-10 sm:py-14">
        {/*
          Sliced band. The scalability band lower down uses a stepped notch;
          this one slopes its whole top and bottom edge and chamfers the
          bottom-left, so the two shapes are siblings rather than repeats.

          Two stacked layers: the outer carries the accent fill and the inner
          is inset by 1px with the same clip, which draws an outline along a
          path CSS `border` cannot follow. Without it the silhouette is
          invisible in light mode, where band and page are both near-white.
        */}
        <div
          className="relative bg-violet-500/45 transition-colors dark:bg-cyan-400/30"
          style={{ clipPath: CLIP_SLICE }}
        >
          <div
            className="relative isolate overflow-hidden bg-gradient-to-br from-violet-50 via-white to-cyan-50 transition-colors dark:from-[#0d1a2f] dark:via-[#0b1424] dark:to-[#101f38]"
            style={{ clipPath: CLIP_SLICE, margin: '1px' }}
          >
          {/* Generative Quantum Facility Background Layer matching Hero Theme */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            <img
              src="/branding/nexora_about_bg.jpg"
              alt="Nexora Quantum Engineering Headquarters"
              className="w-full h-full object-cover object-center opacity-[0.12] dark:opacity-25 transition-opacity duration-500"
              loading="lazy"
            />
          </div>

          {/* Radar sweep — the About band's own motion, distinct from the globe. */}
          <RadarMotif className="pointer-events-none right-[-12%] top-1/2 z-0 hidden aspect-square w-[64%] -translate-y-1/2 text-violet-500/45 sm:block lg:right-[-4%] lg:w-[48%] dark:text-cyan-300/40" />

        <div className="relative z-10 px-6 pt-24 pb-28 sm:px-10 sm:pt-28 sm:pb-32 lg:px-16 xl:px-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-12">
            {/* Story Text */}
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                <Compass className="h-4 w-4" weight="duotone" />
                <span>About Our Company</span>
              </div>
              <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white leading-tight">
                Built by engineers, trusted by global enterprises
              </h2>
              <p className="font-jakarta text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {companyInfo?.aboutStory ||
                  `${companyName} is an enterprise technology innovation firm specializing in distributed cloud platforms, intelligent workflow automation, and custom digital software development. We partner with ambitious global companies to accelerate operational speed, maximize engineering output, and build resilient infrastructure for the future.`}
              </p>
              <div className="p-4 rounded-md border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <span className="font-bold text-violet-600 dark:text-violet-400">Our Mission: </span>
                {companyInfo?.mission}
              </div>
              <div className="flex flex-wrap gap-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-medium">
                  ⚡ Founded 2021
                </span>
                <span className="px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-medium">
                  🌐 140+ Distributed Engineers
                </span>
                <span className="px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-medium">
                  🔒 SOC2 Type II & ISO 27001
                </span>
                <span className="px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md font-medium">
                  🚀 4.8 TB/s Quantum Supercomputing Core
                </span>
              </div>
            </div>

            {/* Animated Multi-Image Interactive Showcase Card */}
            <div
              className="lg:col-span-5 space-y-3"
              onMouseEnter={() => setIsAboutAutoPlaying(false)}
              onMouseLeave={() => setIsAboutAutoPlaying(true)}
            >
              {/* Interactive Tabs Header */}
              <div className="flex items-center gap-1 p-1 rounded-md border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-x-auto">
                {aboutShowcases.map((sc, idx) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setAboutActiveIndex(idx)}
                    className={`flex-1 min-w-[72px] py-1.5 px-2 rounded-md text-[11px] font-outfit font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
                      aboutActiveIndex === idx
                        ? 'bg-violet-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {aboutActiveIndex === idx && (
                      <span className="h-1.5 w-1.5 rounded-md bg-white animate-pulse" />
                    )}
                    <span>{sc.label}</span>
                  </button>
                ))}
              </div>

              {/* Main Featured Interactive Image */}
              {(() => {
                const activeSc = aboutShowcases[aboutActiveIndex] || aboutShowcases[0];

                return (
                  <div className="space-y-2.5">
                    <div className="relative rounded-md overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-900 group">
                      <img
                        src={activeSc.image}
                        alt={activeSc.title}
                        className="w-full h-72 sm:h-80 object-cover group-hover:scale-105 transition-all duration-700 ease-out"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent pointer-events-none" />

                      {/* Live Top Floating Badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold text-slate-300 bg-slate-950/80 px-2 py-1 rounded-md border border-slate-800">
                          {activeSc.telemetry}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-md border backdrop-blur-md ${activeSc.badgeColor}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-md ${activeSc.dotColor} animate-pulse`}
                          />
                          {activeSc.badge}
                        </span>
                      </div>

                      {/* Bottom Overlay Info */}
                      <div className="absolute bottom-3 left-3 right-3 p-3.5 rounded-md bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-left">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-outfit text-xs font-bold text-white tracking-wide">
                            {activeSc.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/60">
                            {activeSc.metric}
                          </span>
                        </div>
                        <p className="font-jakarta text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {activeSc.description}
                        </p>
                      </div>
                    </div>

                    {/* 5 Interactive Thumbnail Switcher Buttons */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {aboutShowcases.map((sc, idx) => (
                        <button
                          key={sc.id}
                          type="button"
                          onClick={() => setAboutActiveIndex(idx)}
                          className={`relative rounded-md overflow-hidden border transition-all cursor-pointer group text-left ${
                            aboutActiveIndex === idx
                              ? 'border-violet-500 ring-1 ring-violet-500 opacity-100'
                              : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-90'
                          }`}
                        >
                          <img
                            src={sc.image}
                            alt={sc.title}
                            className="w-full h-12 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-950/50 flex items-end p-1">
                            <span className="text-[8px] font-outfit font-bold text-white truncate">
                              {sc.label}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 4 Core Value Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {(companyInfo?.values || []).map((val, idx) => (
              <div
                key={idx}
                className="p-5 rounded-md border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md space-y-2 hover:border-violet-500/50 transition-colors"
              >
                <div className="font-outfit text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                  0{idx + 1}
                </div>
                <h3 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">{val.title}</h3>
                <p className="font-jakarta text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {val.description}
                </p>
              </div>
            ))}
          </div>
          </div>
          </div>
        </div>
      </section>

      {/* 3. WHAT WE DO / OUR SOLUTIONS & CAPABILITIES */}
      <section id="what-we-do" className="relative w-full py-10 sm:py-14">
        <div
          className="relative bg-cyan-500/35 dark:bg-violet-400/25"
          style={{ clipPath: CLIP_CHEVRON }}
        >
        <div
          className="relative isolate overflow-hidden bg-slate-100 transition-colors dark:bg-[#0e1526]"
          style={{ clipPath: CLIP_CHEVRON, margin: '1px' }}
        >
        <GridDriftMotif className="pointer-events-none inset-0 z-0 text-cyan-600/25 dark:text-violet-300/20" />
        <div className="relative z-10 w-full px-6 pt-28 pb-16 sm:px-10 sm:pt-32 sm:pb-20 lg:px-16 xl:px-20">
          <Reveal className="text-center max-w-xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Our Capabilities & Solutions
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              What We Build & Deliver
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              We design and ship robust, high-performance technology systems tailored for enterprise reliability and scale.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
            {/* Featured Visual Architecture Card */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 flex-1 flex flex-col justify-end group min-h-[320px]">
                <img
                  src="/branding/nexora_solutions_showcase.jpg"
                  alt="Nexora Autonomous Intelligence Core Architecture"
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-slate-950/10 pointer-events-none" />
                <div className="relative p-5 space-y-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 backdrop-blur-md">
                    <Sparkle className="h-3.5 w-3.5 text-cyan-400" />
                    Autonomous Intelligence Stack
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Next-Gen Scalable Infrastructure
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Zero-trust cloud orchestration, predictive data pipelines, and real-time enterprise AI agents working simultaneously.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 Solutions Grid */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(companyInfo?.solutions || [
                {
                  title: 'Enterprise Cloud & Distributed Systems',
                  description: 'Multi-region Kubernetes architectures, high-throughput microservices, and resilient cloud-native infrastructure.',
                },
                {
                  title: 'Custom Enterprise Software & SaaS',
                  description: 'Full-cycle product development from UI/UX design and prototyping to production deployment and maintenance.',
                },
                {
                  title: 'Workforce Intelligence & Automation',
                  description: 'Next-gen employee lifecycle management, operational automation, and predictive workforce analytics.',
                },
                {
                  title: 'Cybersecurity & Governance Platforms',
                  description: 'Zero-trust role-based access control, SOC 2 compliance frameworks, and comprehensive audit tracking.',
                },
              ]).map((sol, i) => (
                <div
                  key={i}
                  className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 flex flex-col justify-between hover:border-violet-500/40 transition-colors"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-md bg-slate-100 dark:bg-slate-800 text-violet-600 dark:text-violet-400 shrink-0">
                        {renderSolutionIcon(i)}
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        MOD-0{i + 1}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {sol.title}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {sol.description}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                    <span>Enterprise Tier</span>
                    <span>99.99% SLA</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
        </div>
      </section>

      {/* 3b. GLOBAL SCALE & ALWAYS-ON CADENCE */}
      <GlobalScaleSection />

      {/* 4. CULTURE & PERKS AT OUR COMPANY */}
      <section id="perks" className="relative w-full py-10 sm:py-14">
        <div
          className="relative bg-rose-500/35 dark:bg-emerald-400/25"
          style={{ clipPath: CLIP_CHAMFER }}
        >
        <div
          className="relative isolate overflow-hidden bg-gradient-to-b from-white to-rose-50/60 transition-colors dark:from-[#111827] dark:to-[#0c1a18]"
          style={{ clipPath: CLIP_CHAMFER, margin: '1px' }}
        >
        <MoteFieldMotif className="pointer-events-none inset-0 z-0 text-rose-500/45 dark:text-emerald-300/40" />
        <div className="relative z-10 w-full px-6 pt-28 pb-16 sm:px-10 sm:pt-32 sm:pb-20 lg:px-16 xl:px-20">
        <Reveal className="text-center max-w-xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
            Life at Our Company
          </span>
          <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Culture & Comprehensive Benefits
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            We invest in our people with generous packages, flexible autonomy, and holistic wellness support.
          </p>
        </Reveal>

        {/* Culture Feature Banner with Real Lifestyle Imagery */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center mb-8 p-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
          <div className="lg:col-span-5 relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 group">
            <img
              src="/branding/nexora_culture_life.jpg"
              alt="Nexora High-Performance Collaborative Engineering Environment"
              className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white font-semibold">
              <span className="bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md border border-slate-700">
                Remote-First · Async Focus
              </span>
              <span className="bg-emerald-950/80 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-800/60 text-[10px]">
                Work From Anywhere
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider">
              ✦ Autonomy, Mastery & Respect
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Do the best engineering of your career with world-class peers
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              We eliminate unnecessary meetings and bureaucratic red tape. You are trusted to make high-impact technical decisions, collaborate asynchronously across time zones, and build software that matters.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-xs">
              <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="font-bold text-slate-900 dark:text-white">Top 1% Pay</div>
                <div className="text-[11px] text-slate-500">Benchmark competitive</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <div className="font-bold text-slate-900 dark:text-white">Async Workflow</div>
                <div className="text-[11px] text-slate-500">No meeting overload</div>
              </div>
              <div className="p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 col-span-2 sm:col-span-1">
                <div className="font-bold text-slate-900 dark:text-white">Home Setup</div>
                <div className="text-[11px] text-slate-500">$3,000 stipend</div>
              </div>
            </div>
          </div>
        </div>

        {/* 6 Comprehensive Perks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(companyInfo?.perks || []).map((perk, i) => (
            <Reveal key={i} direction="up" delay={i * 70}>
            <div
              className="h-full p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
                {perkIcons[perk.icon] || <CheckCircle className="h-5 w-5 text-violet-500" />}
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{perk.title}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {perk.description}
              </p>
            </div>
            </Reveal>
          ))}
        </div>
        </div>
        </div>
        </div>
      </section>

      {/* 5. OPEN REQUISITIONS & JOB REQUIREMENTS */}
      <section id="open-roles" className="relative w-full py-10 sm:py-14">
        <div
          className="relative bg-violet-500/40 dark:bg-violet-400/25"
          style={{ clipPath: CLIP_TAB }}
        >
        <div
          className="relative isolate overflow-hidden bg-slate-50 transition-colors dark:bg-[#080d1a]"
          style={{ clipPath: CLIP_TAB, margin: '1px' }}
        >
        <AuroraMotif className="pointer-events-none inset-0 z-0 opacity-70 dark:opacity-60" />
        <div className="relative z-10 w-full px-6 pt-28 pb-16 sm:px-10 sm:pt-32 sm:pb-20 lg:px-16 xl:px-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-2">
                <Users className="h-4 w-4" weight="duotone" />
                <span>Careers & Requirements</span>
              </div>
              <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                Open Career Opportunities
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Browse our current openings, review requirements, and apply with your resume.
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Showing <span className="font-bold text-slate-900 dark:text-white">{filteredJobs.length}</span> of {jobs.length} open roles
            </div>
          </div>

          {/* Filter Controls Bar */}
          <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-4 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search Input */}
              <div className="sm:col-span-8 relative">
                <MagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by role title, skill (e.g. React, Figma, Kubernetes, Python)..."
                  className="w-full pl-10 pr-4 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                />
              </div>

              {/* Location Selector */}
              <div className="sm:col-span-4">
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                >
                  <option value="ALL">All Locations & Remote</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Department Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setSelectedDept('ALL')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  selectedDept === 'ALL'
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Departments
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                    selectedDept.toLowerCase() === dept.toLowerCase()
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Jobs Grid */}
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-400">
              Loading current job openings...
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-16 text-center p-8 rounded-md border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No open roles found matching your filters.
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try adjusting your search query or selecting All Departments.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedDept('ALL');
                  setSelectedLocation('ALL');
                }}
                className="mt-4 px-4 py-2 rounded-md text-xs font-semibold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 hover:bg-violet-100 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredJobs.map((job, i) => (
                <Reveal key={job._id} direction="up" delay={Math.min(i, 6) * 60}>
                  <JobCard
                    job={job}
                    onViewDetails={(j) => setSelectedJobForDetail(j)}
                    onApply={(j) => setSelectedJobForApply(j)}
                  />
                </Reveal>
              ))}
            </div>
          )}
        </div>
        </div>
        </div>
      </section>

      {/* 6. GLOBAL HUBS & CONTACT */}
      <section id="hubs" className="relative w-full py-10 sm:py-14">
        <div
          className="relative bg-sky-500/35 dark:bg-sky-400/25"
          style={{ clipPath: CLIP_WEDGE }}
        >
        <div
          className="relative isolate overflow-hidden bg-slate-100 transition-colors dark:bg-[#0b1220]"
          style={{ clipPath: CLIP_WEDGE, margin: '1px' }}
        >
        <WaveMotif className="pointer-events-none inset-0 z-0 text-sky-600/35 dark:text-sky-300/25" />
        <div className="relative z-10 w-full px-6 pt-28 pb-16 sm:px-10 sm:pt-32 sm:pb-20 lg:px-16 xl:px-20 space-y-10">
          <Reveal className="text-center space-y-3 max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Global Presence & Network
            </span>
            <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Connected Across 5 International Hubs
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Operating as a unified global remote organization with specialized collaborative research centers in major tech capitals.
            </p>
          </Reveal>

          {/* Interactive Global Network Map Card */}
          <div className="relative rounded-md overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 group">
            <img
              src="/branding/nexora_global_network.jpg"
              alt="Nexora Technologies Global Digital Hub Network"
              className="w-full h-72 sm:h-96 object-cover group-hover:scale-102 transition-transform duration-700"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent pointer-events-none" />
            
            {/* Hub Chips Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-center gap-2">
              {[
                { name: 'San Francisco', zone: 'HQ · UTC-7' },
                { name: 'London', zone: 'Europe Hub · UTC+1' },
                { name: 'New York', zone: 'East Coast · UTC-4' },
                { name: 'Singapore', zone: 'APAC Central · UTC+8' },
                { name: 'Bengaluru', zone: 'R&D Center · UTC+5:30' },
              ].map((hub, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-slate-700/80 bg-slate-900/85 backdrop-blur-md text-xs font-semibold text-slate-200"
                >
                  <span className="h-2 w-2 rounded-md bg-cyan-400 animate-pulse" />
                  <span className="text-white">{hub.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                    {hub.zone}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Corporate Contact & Inquiries Bar */}
          <div className="p-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-around gap-6 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                <EnvelopeSimple className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Direct Inquiries</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {companyInfo?.corporateEmail || 'contact@nexoratech.com'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Executive Line</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {companyInfo?.phone || '+1 (555) 789-2040'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Global Headquarters</div>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {companyInfo?.headquarters || 'San Francisco, CA & London, UK'}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
        </div>
      </section>

      {/* MODALS */}
      <JobDetailModal
        job={selectedJobForDetail}
        isOpen={!!selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
        onApply={(job) => {
          setSelectedJobForDetail(null);
          setSelectedJobForApply(job);
        }}
      />

      <ApplicationModal
        job={selectedJobForApply}
        isOpen={!!selectedJobForApply}
        onClose={() => setSelectedJobForApply(null)}
        onApplicationSuccess={() => {}}
      />
    </div>
  );
}
