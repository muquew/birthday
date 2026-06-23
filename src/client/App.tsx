import {
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUp,
  History,
  Home,
  Info,
  LayoutDashboard,
  ListFilter,
  LogIn,
  LogOut,
  Moon,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  Users,
  X
} from "lucide-react";
import {
  createContext,
  type DependencyList,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useSearchParams
} from "react-router-dom";
import type {
  AdminOperationLog,
  BirthdayBatchInput,
  BirthdayInput,
  BirthdayWriteOptions,
  BirthdayView,
  CalendarType,
  DataAuditIssue,
  DataAuditReport,
  ImportPreview,
  JsonImportMode,
  SiteSettings
} from "../shared/types.js";
import { DEFAULT_SITE_SETTINGS } from "../shared/settings.js";
import {
  api,
  adminExportUrl,
  type AdminUser,
  type PublicBirthday,
  type PublicSettings,
  type TodayDateInfo
} from "./api.js";
import {
  CustomSelect,
  PublicViewSwitch,
  RangeTabs,
  type PublicBirthdayViewMode,
  type RangeFilter,
  type SelectOption
} from "./components/controls.js";

type LoadState<T> = {
  data?: T;
  loading: boolean;
  error?: string;
};

type AuthState = {
  user?: AdminUser;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

type AdminListView = "records" | "groups" | "tags";
type AdminBatchRequest =
  | {
      action: "show" | "hide" | "delete" | "clearGroup" | "clearTags";
    }
  | {
      action: "setGroup";
      group: string;
    }
  | {
      action: "addTags" | "removeTags";
      tags: string[];
    };
type BatchTagMode = "add" | "remove";
type AppTheme = "classic" | "bright" | "dark";

type ThemeState = {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
};

type AdminBirthdaySummary = {
  total: number;
  hidden: number;
  lunarAttention: number;
  duplicateKeyCount: number;
  duplicateRecordCount: number;
};

const AuthContext = createContext<AuthState | undefined>(undefined);
const ThemeContext = createContext<ThemeState | undefined>(undefined);

const THEME_STORAGE_KEY = "xingxing-theme";
const themeOptions: Array<SelectOption<AppTheme>> = [
  { value: "classic", label: "经典暖色" },
  { value: "bright", label: "清透亮色" },
  { value: "dark", label: "夜间深色" }
];
const DIPPER_POINTS = [
  { x: 128, y: 20 },
  { x: 132, y: 52 },
  { x: 100, y: 68 },
  { x: 88, y: 42 },
  { x: 64, y: 48 },
  { x: 40, y: 54 },
  { x: 20, y: 76 }
] as const;
const DIPPER_LINES = [
  [6, 5],
  [5, 4],
  [4, 3],
  [3, 2],
  [2, 1],
  [1, 0]
] as const;

const emptyForm: BirthdayFormState = {
  name: "",
  calendarType: "gregorian",
  year: "",
  month: "1",
  day: "1",
  isLeapMonth: false,
  leapMonthPolicy: "normalMonthIfNoLeap",
  displayAge: false,
  group: "",
  tags: "",
  note: "",
  visible: true
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="birthdays" element={<BirthdaysPage />} />
            <Route path="months" element={<MonthsPage />} />
          </Route>
          <Route path="admin/login" element={<LoginPage />} />
          <Route
            path="admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminBirthdaysPage />} />
            <Route path="birthdays" element={<Navigate to="/admin" replace />} />
            <Route path="import" element={<ImportExportPage />} />
            <Route path="audit" element={<AdminDataAuditPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isAppTheme(stored) ? stored : "classic";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  );
}

function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("ThemeContext is missing");
  }
  return value;
}

function isAppTheme(value: string | null): value is AppTheme {
  return value === "classic" || value === "bright" || value === "dark";
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | undefined>();
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const result = await api.me();
      setUser(result.user ?? undefined);
    } catch {
      setUser(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const value: AuthState = {
    user,
    loading,
    refresh,
    login: async (username, password) => {
      const result = await api.login(username, password);
      setUser(result.user);
    },
    logout: async () => {
      await api.logout();
      setUser(undefined);
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("AuthContext is missing");
  }
  return value;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.loading) {
    return <LoadingScreen label="正在确认管理员身份" />;
  }
  if (!auth.user) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}

function PublicLayout() {
  const settings = usePublicSettings();
  const siteName = settings.data?.siteName ?? "星星生日墙";
  const correctionContact = settings.data?.correctionContact?.trim();
  const publicNav = (
    <>
      <NavLink to="/">
        <Home size={17} aria-hidden />
        首页
      </NavLink>
      <NavLink to="/birthdays">
        <Users size={17} aria-hidden />
        全部
      </NavLink>
      <NavLink to="/months">
        <CalendarDays size={17} aria-hidden />
        月份
      </NavLink>
    </>
  );

  return (
    <div className="site-shell">
      <header className="public-header">
        <Link className="brand" to="/">
          <Sparkles size={24} aria-hidden />
          <span>{siteName}</span>
        </Link>
        <div className="public-header-actions">
          <nav className="nav-tabs" aria-label="公共导航">{publicNav}</nav>
          <ThemeSelect compact />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      {correctionContact ? (
        <footer className="public-footer">
          <span>纠错</span>
          <small>{correctionContact}</small>
        </footer>
      ) : null}
      <nav className="mobile-tabbar" aria-label="移动端公共导航">
        {publicNav}
      </nav>
    </div>
  );
}

function AdminLayout() {
  const auth = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.logout();
    navigate("/admin/login");
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="admin-brand" to="/admin">
          <Sparkles size={22} aria-hidden />
          <span>生日后台</span>
        </Link>
        <nav className="admin-nav" aria-label="后台导航">
          <NavLink to="/admin" end>
            <LayoutDashboard size={18} aria-hidden />
            工作台
          </NavLink>
          <NavLink to="/admin/import">
            <FileUp size={18} aria-hidden />
            导入备份
          </NavLink>
          <NavLink to="/admin/audit">
            <ShieldCheck size={18} aria-hidden />
            数据巡检
          </NavLink>
          <NavLink to="/admin/logs">
            <History size={18} aria-hidden />
            操作日志
          </NavLink>
          <NavLink to="/admin/settings">
            <Settings size={18} aria-hidden />
            站点设置
          </NavLink>
        </nav>
        <ThemeSelect />
        <button className="ghost-button sidebar-button" onClick={handleLogout}>
          <LogOut size={17} aria-hidden />
          退出
        </button>
      </aside>
      <section className="admin-main">
        <Outlet />
      </section>
    </div>
  );
}

function HomePage() {
  const birthdays = usePublicBirthdays();
  const todayInfo = useTodayInfo();
  const settings = usePublicSettings();
  const [copyMessage, setCopyMessage] = useState("");
  const [greetingIndex, setGreetingIndex] = useState(0);
  const siteName = settings.data?.siteName ?? "星星生日墙";
  const upcomingDays = settings.data?.defaultUpcomingDays ?? 30;
  const today = birthdays.data?.filter((item) => item.occurrence?.daysUntil === 0) ?? [];
  const starBirthdays = birthdays.data?.slice(0, 7) ?? [];
  const greetingTemplates =
    settings.data?.birthdayGreetingTemplates ?? DEFAULT_SITE_SETTINGS.birthdayGreetingTemplates;
  const greetingOptions = useMemo(
    () => birthdayGreetingOptions(today, greetingTemplates),
    [greetingTemplates, today]
  );
  const greeting = greetingOptions[greetingIndex % Math.max(greetingOptions.length, 1)] ?? "";
  const upcoming =
    birthdays.data
      ?.filter((item) => {
        const days = item.occurrence?.daysUntil ?? 9999;
        return days > 0 && days <= upcomingDays;
      })
      .slice(0, 8) ?? [];

  useEffect(() => {
    setGreetingIndex(0);
    setCopyMessage("");
  }, [today.map((item) => item.id).join("|")]);

  const handleCopyToday = async () => {
    if (!greeting) {
      return;
    }
    try {
      if (!navigator.clipboard?.writeText) {
        setCopyMessage("无法复制");
        return;
      }
      await navigator.clipboard.writeText(greeting);
      setCopyMessage("已复制");
    } catch {
      setCopyMessage("无法复制");
    }
    window.setTimeout(() => setCopyMessage(""), 1800);
  };

  return (
    <div className="page-flow home-page-flow">
      <section className="home-hero">
        <div className="hero-theatre" aria-hidden="true">
          <span className="theatre-orbit orbit-one" />
          <span className="theatre-orbit orbit-two" />
          <span className="theatre-orbit orbit-three" />
          <span className="theatre-star star-one" />
          <span className="theatre-star star-two" />
          <span className="theatre-star star-three" />
        </div>
        <div className="home-left-column">
          <div className="hero-copy star-hero-copy">
            <div className="hero-kicker">
              <span>星星生日日历</span>
              <small>{todayInfo.data?.weekday ?? "Today"}</small>
            </div>
            <h1>{siteName}</h1>
            <p className="hero-subtitle">
              把每一次生日整理成安静清楚的星历，让祝福、提醒和相见都有一个好看的位置。
            </p>
          </div>
          <div className="today-panel">
            <TodaySummary dateInfo={todayInfo.data} dateLoading={todayInfo.loading} />
            <section className="today-birthday-panel" aria-label="今日生日">
              <span className="today-light-orbit" aria-hidden="true" />
              <div className="panel-heading">
                <span>今日生日</span>
                {today.length > 0 ? (
                  <button className="icon-text-button" type="button" onClick={handleCopyToday}>
                    <Copy size={16} aria-hidden />
                    {copyMessage || "复制祝福"}
                  </button>
                ) : (
                  <Sparkles size={18} aria-hidden />
                )}
              </div>
              {birthdays.loading ? (
                <InlineLoading />
              ) : today.length > 0 ? (
                <div className="today-list">
                  {today.map((item) => (
                    <BirthdaySpotlight key={item.id} birthday={item} />
                  ))}
                </div>
              ) : (
                <EmptyState title="今天暂时没有记录" />
              )}
              {today.length > 0 ? (
                <BirthdayGreetingBox
                  greeting={greeting}
                  onShuffle={() => setGreetingIndex((current) => current + 1)}
                />
              ) : null}
            </section>
          </div>
        </div>
        <div className="home-right-column">
          <StarStageCard
            loading={birthdays.loading}
            birthdays={starBirthdays}
            activeWindowDays={upcomingDays}
          />
        </div>
      </section>

      {birthdays.error ? <Notice tone="danger">{birthdays.error}</Notice> : null}

      <section className="section-block upcoming-section star-trail-section">
        <SectionTitle
          title={`接下来 ${upcomingDays} 天`}
          action={
            <Link className="text-link" to="/birthdays">
              查看全部 <ChevronRight size={16} aria-hidden />
            </Link>
          }
        />
        <BirthdayGrid birthdays={upcoming} fillRowColumns={3} loading={birthdays.loading} />
      </section>

    </div>
  );
}

function TodaySummary({
  dateInfo,
  dateLoading
}: {
  dateInfo?: TodayDateInfo;
  dateLoading: boolean;
}) {
  return (
    <section className="today-summary" aria-label="今日日期">
      <div className="today-date-head">
        <span className="date-chip">
          <CalendarDays size={16} aria-hidden />
          今日星历
        </span>
        <small>{dateInfo?.weekday ?? " "}</small>
      </div>
      <div className="today-date-main">
        <strong>{dateInfo?.solarText ?? "读取日期中"}</strong>
        <span>
          <Moon size={16} aria-hidden />
          {dateLoading ? "农历读取中" : dateInfo?.lunarText ?? "农历暂不可用"}
        </span>
      </div>
    </section>
  );
}

function StarStageCard({
  activeWindowDays,
  loading,
  birthdays
}: {
  activeWindowDays: number;
  loading: boolean;
  birthdays: PublicBirthday[];
}) {
  const isLit = (birthday?: PublicBirthday) => {
    const daysUntil = birthday?.occurrence?.daysUntil;
    return typeof daysUntil === "number" && daysUntil >= 0 && daysUntil <= activeWindowDays;
  };

  return (
    <article className="star-stage-card">
      <div className="stage-sky">
        <span className="stage-rings" aria-hidden="true" />
        <span className="stage-depth-dust" aria-hidden="true" />
        <span className="stage-comet" aria-hidden="true" />
        <span className="stage-horizon" aria-hidden="true" />
        <svg className="dipper-map" viewBox="0 0 150 94" role="img" aria-label="北斗七星生日图">
          {DIPPER_LINES.map(([from, to]) => (
            <line
              className={`dipper-line ${isLit(birthdays[from]) && isLit(birthdays[to]) ? "active" : ""}`}
              key={`${from}-${to}`}
              x1={DIPPER_POINTS[from].x}
              y1={DIPPER_POINTS[from].y}
              x2={DIPPER_POINTS[to].x}
              y2={DIPPER_POINTS[to].y}
            />
          ))}
          {DIPPER_POINTS.map((point, index) => {
            const birthday = birthdays[index];
            const lit = isLit(birthday);
            return (
              <g key={`${point.x}-${point.y}`}>
                <circle
                  className={`dipper-star ${lit ? "active" : birthday ? "preview" : "empty"} ${
                    birthday?.occurrence?.daysUntil === 0 ? "today" : ""
                  }`}
                  cx={point.x}
                  cy={point.y}
                  r={index === 3 ? 2.4 : 2}
                />
                <title>
                  {birthday ? "已点亮的生日星位" : "等待生日记录"}
                </title>
              </g>
            );
          })}
        </svg>
        <span className="stage-glow" />
      </div>
      <div className="stage-copy">
        <strong>{loading ? "读取星图" : "北斗七星"}</strong>
      </div>
    </article>
  );
}

function BirthdaysPage() {
  const birthdays = usePublicBirthdays();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [calendarType, setCalendarType] = useState<"all" | CalendarType>("all");
  const [range, setRange] = useState<RangeFilter>("all");
  const [viewMode, setViewMode] = useState<PublicBirthdayViewMode>(() =>
    publicViewModeFromParam(searchParams.get("view"))
  );
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const nextViewMode = publicViewModeFromParam(searchParams.get("view"));
    setViewMode((current) => (current === nextViewMode ? current : nextViewMode));
  }, [searchParams]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (birthdays.data ?? []).filter((item) => {
      const matchesQuery = matchBirthdayQuery(item, normalized);
      const matchesMonth =
        month === "all" || String(item.occurrence?.date.month) === month;
      const matchesType = calendarType === "all" || item.calendarType === calendarType;
      const matchesRange = matchRange(item, range);
      return matchesQuery && matchesMonth && matchesType && matchesRange;
    });
  }, [birthdays.data, calendarType, month, query, range]);

  const hasActiveFilters =
    query.trim() !== "" || month !== "all" || calendarType !== "all" || range !== "all";
  const totalCount = birthdays.data?.length ?? 0;
  const resetPublicFilters = () => {
    setQuery("");
    setMonth("all");
    setCalendarType("all");
    setRange("all");
  };
  const handleViewModeChange = (nextViewMode: PublicBirthdayViewMode) => {
    setViewMode(nextViewMode);
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (nextViewMode === "calendar") {
          next.set("view", "calendar");
        } else {
          next.delete("view");
        }
        return next;
      },
      { replace: true }
    );
  };

  return (
    <div className="page-flow directory-page-flow">
      <PageTitle title="全部生日" meta={birthdays.loading ? "读取中" : `共 ${totalCount} 人`} />
      <section className="directory-controls" aria-label="生日筛选和视图">
        <div className="public-filter-head">
          <label className="search-field">
            <Search size={18} aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索姓名、分组、标签"
            />
          </label>
          <button
            className="secondary-button filter-toggle"
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <ListFilter size={17} aria-hidden />
            筛选
          </button>
        </div>
        <div className={`filter-drawer ${filtersOpen ? "open" : ""}`}>
          <RangeTabs value={range} onChange={setRange} />
          <div className="filter-bar">
            <CustomSelect
              ariaLabel="生日月份"
              value={month}
              onChange={setMonth}
              options={[
                { value: "all", label: "全部月份" },
                ...Array.from({ length: 12 }, (_, index) => {
                  const value = String(index + 1);
                  return { value, label: `${value} 月` };
                })
              ]}
            />
            <CustomSelect
              ariaLabel="生日类型"
              value={calendarType}
              onChange={setCalendarType}
              options={[
                { value: "all", label: "全部类型" },
                { value: "gregorian", label: "公历" },
                { value: "lunar", label: "农历" }
              ]}
            />
            {hasActiveFilters ? (
              <button className="secondary-button filter-reset-button" type="button" onClick={resetPublicFilters}>
                <RotateCcw size={16} aria-hidden />
                清除筛选
              </button>
            ) : null}
          </div>
        </div>
        <PublicViewSwitch value={viewMode} onChange={handleViewModeChange} />
      </section>
      {birthdays.error ? <Notice tone="danger">{birthdays.error}</Notice> : null}
      {viewMode === "calendar" ? (
        <BirthdayCalendarView birthdays={filtered} loading={birthdays.loading} />
      ) : (
        <BirthdayGrid birthdays={filtered} loading={birthdays.loading} />
      )}
    </div>
  );
}

function publicViewModeFromParam(value: string | null): PublicBirthdayViewMode {
  return value === "calendar" ? "calendar" : "list";
}

function MonthsPage() {
  const birthdays = usePublicBirthdays();
  const [activeMonth, setActiveMonth] = useState(() => new Date().getMonth() + 1);
  const monthSelectionGuardUntil = useRef(0);

  const scrollToMonth = (month: number) => {
    const element = document.getElementById(`month-${month}`);
    if (!element) {
      return;
    }
    const isMobile = window.matchMedia("(max-width: 740px)").matches;
    const offset = isMobile ? 86 : 24;
    const top = window.scrollY + element.getBoundingClientRect().top - offset;
    monthSelectionGuardUntil.current = Date.now() + 1100;
    setActiveMonth(month);
    window.scrollTo({
      behavior: "smooth",
      top: Math.max(0, top)
    });
  };

  useEffect(() => {
    let frame = 0;

    const updateActiveMonth = () => {
      frame = 0;
      if (Date.now() < monthSelectionGuardUntil.current) {
        return;
      }
      const isMobile = window.matchMedia("(max-width: 740px)").matches;
      const targetY = window.innerHeight * (isMobile ? 0.24 : 0.38);
      let nextActive = 1;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let month = 1; month <= 12; month += 1) {
        const element = document.getElementById(`month-${month}`);
        if (!element) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        if (rect.top <= targetY && rect.bottom >= targetY) {
          nextActive = month;
          nearestDistance = 0;
          break;
        }

        const distance = Math.abs(rect.top - targetY);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nextActive = month;
        }
      }

      setActiveMonth((current) => (current === nextActive ? current : nextActive));
    };

    const scheduleUpdate = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(updateActiveMonth);
    };

    updateActiveMonth();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, []);

  const scrollMonthFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const rail = event.currentTarget;
    const rect = rail.getBoundingClientRect();
    const offset = Math.min(Math.max(event.clientY - rect.top, 0), rect.height - 1);
    const month = Math.min(12, Math.max(1, Math.floor((offset / rect.height) * 12) + 1));
    scrollToMonth(month);
    event.preventDefault();
  };
  const handleMonthRailPointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    scrollMonthFromPointer(event);
  };
  const handleMonthRailPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.buttons === 0 && event.pointerType !== "touch") {
      return;
    }
    scrollMonthFromPointer(event);
  };
  const groups = useMemo(() => {
    const map = new Map<number, PublicBirthday[]>();
    for (const item of birthdays.data ?? []) {
      const month = item.occurrence?.date.month;
      if (!month) {
        continue;
      }
      map.set(month, [...(map.get(month) ?? []), item]);
    }
    return Array.from({ length: 12 }, (_, index) => ({
      month: index + 1,
      birthdays: map.get(index + 1) ?? []
    }));
  }, [birthdays.data]);

  return (
    <div className="page-flow months-page-flow">
      <PageTitle title="按下次日期查看" />
      {birthdays.error ? <Notice tone="danger">{birthdays.error}</Notice> : null}
      <div className="months-layout">
        <nav
          className="month-rail"
          aria-label="月份导航"
          onPointerDown={handleMonthRailPointerDown}
          onPointerMove={handleMonthRailPointerMove}
        >
          {groups.map((group) => (
            <a
              aria-current={activeMonth === group.month ? "true" : undefined}
              className={activeMonth === group.month ? "active" : undefined}
              href={`#month-${group.month}`}
              key={group.month}
              onClick={(event) => {
                event.preventDefault();
                scrollToMonth(group.month);
              }}
            >
              <span className="month-rail-line" />
              <span className="month-rail-label">{group.month}月</span>
            </a>
          ))}
        </nav>
        <div className="month-board">
          {groups.map((group) => (
            <section className="month-lane" id={`month-${group.month}`} key={group.month}>
              <header>
                <span>{group.month}</span>
                <small>月</small>
              </header>
              <div className="month-lane-list">
                {birthdays.loading ? (
                  <InlineLoading />
                ) : group.birthdays.length > 0 ? (
                  group.birthdays.map((item) => (
                    <CompactBirthday key={item.id} birthday={item} />
                  ))
                ) : (
                  <span className="muted">暂无记录</span>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThemeSelect({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`theme-control ${compact ? "compact" : ""}`}>
      <Palette size={16} aria-hidden />
      <CustomSelect
        ariaLabel="界面主题"
        className="theme-select"
        value={theme}
        onChange={setTheme}
        options={themeOptions}
      />
    </div>
  );
}

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.user) {
      navigate("/admin", { replace: true });
    }
  }, [auth.user, navigate]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await auth.login(username, password);
      navigate("/admin", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <form className="login-panel" onSubmit={handleSubmit}>
        <Link className="brand" to="/">
          <Sparkles size={24} aria-hidden />
          <span>星星生日墙</span>
        </Link>
        <h1>管理员登录</h1>
        <label>
          用户名
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <label>
          密码
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <button className="primary-button" disabled={submitting}>
          <LogIn size={18} aria-hidden />
          {submitting ? "登录中" : "登录"}
        </button>
      </form>
    </main>
  );
}

function AdminBirthdaysPage() {
  const birthdays = useAdminBirthdayData();
  const { records, refresh, summary } = birthdays;
  const [searchParams, setSearchParams] = useSearchParams();
  const routeQuery = searchParams.get("q") ?? "";
  const [editing, setEditing] = useState<BirthdayView | undefined>();
  const [error, setError] = useState("");
  const [query, setQuery] = useState(routeQuery);
  const [calendarFilter, setCalendarFilter] = useState<"all" | CalendarType>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");
  const [viewMode, setViewMode] = useState<AdminListView>("records");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(routeQuery);
    if (routeQuery) {
      setViewMode("records");
    }
  }, [routeQuery]);

  useEffect(() => {
    const existingIds = new Set(records.map((item) => item.id));
    setSelectedIds((current) => {
      const next = new Set(Array.from(current).filter((id) => existingIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [records]);

  const handleSave = async (input: BirthdayInput, options: BirthdayWriteOptions = {}) => {
    setError("");
    setMessage("");
    try {
      if (editing) {
        await api.updateBirthday(editing.id, input, options);
      } else {
        await api.createBirthday(input, options);
      }
      setEditing(undefined);
      await refresh();
      setMessage(editing ? "生日记录已更新" : "生日记录已新增");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      throw err;
    }
  };

  const handleDelete = async (item: BirthdayView) => {
    if (!window.confirm(`确认删除 ${item.name} 吗？`)) {
      return;
    }
    setError("");
    setMessage("");
    try {
      await api.deleteBirthday(item.id);
      await refresh();
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      setMessage(`已删除 ${item.name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const handleVisibility = async (item: BirthdayView) => {
    setError("");
    setMessage("");
    try {
      await api.setVisibility(item.id, !item.visible);
      await refresh();
      setMessage(`${item.name} 已${item.visible ? "隐藏" : "公开"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新公开状态失败");
    }
  };

  const handleEdit = (item: BirthdayView) => {
    setEditing(item);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = (ids: string[], checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (checked) {
          next.add(id);
        } else {
          next.delete(id);
        }
      }
      return next;
    });
  };

  const handleBatch = async (request: AdminBatchRequest) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }
    if (!confirmAdminBatchRequest(request, ids.length)) {
      return;
    }
    setError("");
    setMessage("");
    try {
      const result = await api.batchBirthdays({ ids, ...request } as BirthdayBatchInput);
      await refresh();
      if (request.action === "show" || request.action === "hide" || request.action === "delete") {
        setSelectedIds(new Set());
      }
      setMessage(adminBatchResultMessage(request, result.count));
    } catch (err) {
      setError(err instanceof Error ? err.message : "批量操作失败");
    }
  };

  const resetFilters = () => {
    setQuery("");
    setCalendarFilter("all");
    setVisibilityFilter("all");
    setRangeFilter("all");
    setSearchParams({});
  };

  const filteredRecords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((item) => {
      const matchesQuery = matchBirthdayQuery(item, normalized);
      const matchesType =
        calendarFilter === "all" || item.calendarType === calendarFilter;
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" ? item.visible : !item.visible);
      const matchesRange = matchRange(item, rangeFilter);
      return (
        matchesQuery &&
        matchesType &&
        matchesVisibility &&
        matchesRange
      );
    });
  }, [
    calendarFilter,
    query,
    rangeFilter,
    records,
    visibilityFilter
  ]);
  const hasActiveAdminFilters =
    query.trim() !== "" ||
    calendarFilter !== "all" ||
    visibilityFilter !== "all" ||
    rangeFilter !== "all";
  const canResetAdminView = hasActiveAdminFilters || viewMode !== "records";
  const groupOptions = useMemo(
    () => uniqueSortedValues(records.map((item) => item.group).filter(Boolean)),
    [records]
  );
  const tagOptions = useMemo(
    () => uniqueSortedValues(records.flatMap((item) => item.tags)),
    [records]
  );

  return (
    <div className="admin-flow">
      <AdminTitle
        title="生日工作台"
        action={
          <Link className="secondary-button" to="/admin/import">
            <Upload size={17} aria-hidden />
            导入备份
          </Link>
        }
      />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error || birthdays.error ? (
        <Notice tone="danger">{error || birthdays.error}</Notice>
      ) : null}
      <AdminStatusRail
        summary={summary}
        loading={birthdays.loading}
      />
      <div className="admin-workspace">
        <section className="admin-section table-section">
          <SectionTitle
            title="记录列表"
            action={<span className="admin-record-count">当前 {filteredRecords.length} 条</span>}
          />
          <div className="admin-filter-bar">
            <label className="search-field">
              <Search size={18} aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索姓名、分组、标签"
              />
            </label>
            <CustomSelect
              ariaLabel="后台生日类型"
              value={calendarFilter}
              onChange={setCalendarFilter}
              options={[
                { value: "all", label: "全部类型" },
                { value: "gregorian", label: "公历" },
                { value: "lunar", label: "农历" }
              ]}
            />
            <CustomSelect
              ariaLabel="公开状态"
              value={visibilityFilter}
              onChange={setVisibilityFilter}
              options={[
                { value: "all", label: "全部状态" },
                { value: "visible", label: "仅公开" },
                { value: "hidden", label: "仅隐藏" }
              ]}
            />
            <CustomSelect
              ariaLabel="生日范围"
              value={rangeFilter}
              onChange={setRangeFilter}
              options={[
                { value: "all", label: "全部范围" },
                { value: "today", label: "今天" },
                { value: "7", label: "7天内" },
                { value: "30", label: "30天内" },
                { value: "90", label: "90天内" }
              ]}
            />
            <button
              className="secondary-button"
              disabled={!canResetAdminView}
              type="button"
              onClick={() => {
                resetFilters();
                setViewMode("records");
              }}
            >
              <ListFilter size={17} aria-hidden />
              重置
            </button>
          </div>
          <AdminBatchToolbar
            selectedCount={selectedIds.size}
            groupOptions={groupOptions}
            tagOptions={tagOptions}
            onShow={() => void handleBatch({ action: "show" })}
            onHide={() => void handleBatch({ action: "hide" })}
            onDelete={() => void handleBatch({ action: "delete" })}
            onSetGroup={(group) => void handleBatch({ action: "setGroup", group })}
            onClearGroup={() => void handleBatch({ action: "clearGroup" })}
            onAddTags={(tags) => void handleBatch({ action: "addTags", tags })}
            onRemoveTags={(tags) => void handleBatch({ action: "removeTags", tags })}
            onClearTags={() => void handleBatch({ action: "clearTags" })}
            onClear={() => setSelectedIds(new Set())}
          />
          <AdminViewTabs value={viewMode} onChange={setViewMode} />
          {viewMode === "records" ? (
            <AdminTable
              birthdays={filteredRecords}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onVisibility={handleVisibility}
            />
          ) : (
            <AdminFacetView
              records={filteredRecords}
              kind={viewMode === "groups" ? "group" : "tag"}
              onApply={(value) => {
                setQuery(value);
                setViewMode("records");
              }}
            />
          )}
        </section>
        <div className="editor-pane" ref={formRef}>
          <BirthdayForm
            key={editing?.id ?? "new"}
            editing={editing}
            records={records}
            onCancel={() => setEditing(undefined)}
            onSave={handleSave}
          />
        </div>
      </div>
    </div>
  );
}

function AdminLogsPage() {
  const logs = useAdminOperationLogs(160);
  return (
    <div className="admin-flow">
      <AdminTitle title="操作日志" />
      <section className="admin-section">
        <SectionTitle
          title="最近操作"
          action={
            <span className="log-title-note">
              <History size={15} aria-hidden />
              最近 {logs.data?.length ?? 0} 条
            </span>
          }
        />
        <OperationLogList logs={logs.data ?? []} loading={logs.loading} error={logs.error} />
      </section>
    </div>
  );
}

function AdminDataAuditPage() {
  const audit = useAdminDataAudit();
  const issues = audit.data?.issues ?? [];
  const seriousIssues = issues.filter((issue) => issue.severity !== "info");

  return (
    <div className="admin-flow">
      <AdminTitle title="数据巡检" />
      {audit.error ? <Notice tone="danger">{audit.error}</Notice> : null}
      <section className="admin-section audit-overview-section">
        <SectionTitle
          title="巡检总览"
          action={
            audit.data ? (
              <span className="log-title-note">
                <ShieldCheck size={15} aria-hidden />
                {formatDateTime(audit.data.generatedAt)}
              </span>
            ) : null
          }
        />
        {audit.loading ? (
          <InlineLoading />
        ) : audit.data ? (
          <div className="audit-summary-grid">
            <AuditSummaryCard label="记录总数" value={audit.data.totalRecords} />
            <AuditSummaryCard label="巡检项" value={audit.data.issueCount} />
            <AuditSummaryCard label="需关注" value={audit.data.attentionCount} tone={seriousIssues.length > 0 ? "warn" : "ok"} />
          </div>
        ) : null}
      </section>

      {!audit.loading && audit.data && issues.length === 0 ? (
        <Notice tone="success">当前没有发现需要关注的数据问题。</Notice>
      ) : null}

      {issues.length > 0 ? (
        <section className="audit-issue-grid" aria-label="数据巡检结果">
          {issues.map((issue) => (
            <AuditIssueCard issue={issue} key={issue.id} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function AuditSummaryCard({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: number;
  tone?: "neutral" | "ok" | "warn";
}) {
  return (
    <article className={`audit-summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function AuditIssueCard({ issue }: { issue: DataAuditIssue }) {
  const visibleRecords = issue.birthdays.slice(0, 8);
  const extraCount = issue.birthdays.length - visibleRecords.length;
  return (
    <article className={`audit-card ${issue.severity}`}>
      <div className="audit-card-head">
        <span>{auditSeverityLabel(issue.severity)}</span>
        <strong>{issue.title}</strong>
        <em>{issue.count} 条</em>
      </div>
      <p>{issue.description}</p>
      <div className="audit-record-list">
        {visibleRecords.map((birthday) => (
          <div className="audit-record" key={birthday.id}>
            <strong>{birthday.name}</strong>
            <span>{birthdayDateText(birthday)}</span>
            <small>{auditRecordMeta(birthday)}</small>
            <Link className="audit-record-action" to={`/admin?q=${encodeURIComponent(birthday.name)}`}>
              处理
            </Link>
          </div>
        ))}
        {extraCount > 0 ? <span className="audit-more">还有 {extraCount} 条</span> : null}
      </div>
    </article>
  );
}

function auditSeverityLabel(severity: DataAuditIssue["severity"]): string {
  if (severity === "bad") {
    return "需处理";
  }
  if (severity === "warn") {
    return "建议复核";
  }
  return "留意";
}

function auditRecordMeta(birthday: BirthdayView): string {
  return [
    birthday.group ?? "未分组",
    birthday.visible ? "公开" : "隐藏",
    birthday.tags.length > 0 ? birthday.tags.join(" / ") : undefined
  ]
    .filter(Boolean)
    .join(" · ");
}

function AdminBatchToolbar({
  selectedCount,
  groupOptions,
  tagOptions,
  onShow,
  onHide,
  onDelete,
  onSetGroup,
  onClearGroup,
  onAddTags,
  onRemoveTags,
  onClearTags,
  onClear
}: {
  selectedCount: number;
  groupOptions: string[];
  tagOptions: string[];
  onShow: () => void;
  onHide: () => void;
  onDelete: () => void;
  onSetGroup: (group: string) => void;
  onClearGroup: () => void;
  onAddTags: (tags: string[]) => void;
  onRemoveTags: (tags: string[]) => void;
  onClearTags: () => void;
  onClear: () => void;
}) {
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [groupValue, setGroupValue] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [tagMode, setTagMode] = useState<BatchTagMode>("add");
  const parsedTags = useMemo(() => parseAdminTagInput(tagValue), [tagValue]);
  const selected = selectedCount > 0;

  useEffect(() => {
    if (!selected) {
      setOrganizeOpen(false);
    }
  }, [selected]);

  const appendTagValue = (tag: string) => {
    setTagValue((current) => {
      const tags = parseAdminTagInput(current);
      return tags.includes(tag) ? current : [...tags, tag].join("|");
    });
  };

  const applyGroup = () => {
    const group = groupValue.trim();
    if (group) {
      onSetGroup(group);
    }
  };

  const applyTags = () => {
    if (parsedTags.length === 0) {
      return;
    }
    if (tagMode === "add") {
      onAddTags(parsedTags);
      return;
    }
    onRemoveTags(parsedTags);
  };

  return (
    <div className={`batch-toolbar ${selected ? "active" : ""}`}>
      <div className="batch-summary">
        <strong>{selected ? `已选 ${selectedCount} 条` : "批量操作"}</strong>
        <span>{selected ? "可调整公开状态、分组和标签" : "勾选记录后可批量处理"}</span>
      </div>
      <div className="batch-actions">
        <button className="secondary-button" type="button" onClick={onShow} disabled={!selected}>
          <Eye size={16} aria-hidden />
          公开
        </button>
        <button className="secondary-button" type="button" onClick={onHide} disabled={!selected}>
          <EyeOff size={16} aria-hidden />
          隐藏
        </button>
        <button
          aria-expanded={organizeOpen}
          className="secondary-button"
          type="button"
          onClick={() => setOrganizeOpen((current) => !current)}
          disabled={!selected}
        >
          <Tags size={16} aria-hidden />
          整理
        </button>
        <button className="secondary-button danger-text" type="button" onClick={onDelete} disabled={!selected}>
          <Trash2 size={16} aria-hidden />
          删除
        </button>
        {selected ? (
          <button className="ghost-button" type="button" onClick={onClear}>
            <X size={16} aria-hidden />
            取消选择
          </button>
        ) : null}
      </div>
      {organizeOpen && selected ? (
        <div className="batch-organize-panel">
          <div className="batch-organize-block">
            <div className="batch-organize-head">
              <Users size={16} aria-hidden />
              <div>
                <strong>分组</strong>
                <small>设置分组会覆盖已选记录原有分组</small>
              </div>
            </div>
            <div className="batch-input-row">
              <input
                value={groupValue}
                onChange={(event) => setGroupValue(event.target.value)}
                placeholder="输入分组名称"
              />
              <button className="secondary-button" type="button" onClick={applyGroup} disabled={!groupValue.trim()}>
                设置分组
              </button>
              <button className="ghost-button danger-text" type="button" onClick={onClearGroup}>
                清除分组
              </button>
            </div>
            {groupOptions.length > 0 ? (
              <div className="batch-choice-row" aria-label="已有分组">
                {groupOptions.slice(0, 8).map((group) => (
                  <button key={group} type="button" onClick={() => setGroupValue(group)}>
                    {group}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="batch-organize-block">
            <div className="batch-organize-head">
              <Tags size={16} aria-hidden />
              <div>
                <strong>标签</strong>
                <small>添加会保留原标签并去重，移除只删除指定标签</small>
              </div>
            </div>
            <div className="batch-tag-mode" role="group" aria-label="批量标签模式">
              <button
                className={tagMode === "add" ? "active" : ""}
                type="button"
                onClick={() => setTagMode("add")}
              >
                添加标签
              </button>
              <button
                className={tagMode === "remove" ? "active" : ""}
                type="button"
                onClick={() => setTagMode("remove")}
              >
                移除标签
              </button>
            </div>
            <div className="batch-input-row">
              <input
                value={tagValue}
                onChange={(event) => setTagValue(event.target.value)}
                placeholder="多个标签用 |、;、逗号或换行分隔"
              />
              <button className="secondary-button" type="button" onClick={applyTags} disabled={parsedTags.length === 0}>
                {tagMode === "add" ? "添加" : "移除"}
              </button>
              <button className="ghost-button danger-text" type="button" onClick={onClearTags}>
                清空标签
              </button>
            </div>
            {tagOptions.length > 0 ? (
              <div className="batch-choice-row" aria-label="已有标签">
                {tagOptions.slice(0, 10).map((tag) => (
                  <button key={tag} type="button" onClick={() => appendTagValue(tag)}>
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminViewTabs({
  value,
  onChange
}: {
  value: AdminListView;
  onChange: (value: AdminListView) => void;
}) {
  const options: Array<{ value: AdminListView; label: string; icon: ReactNode }> = [
    { value: "records", label: "明细", icon: <ListFilter size={16} aria-hidden /> },
    { value: "groups", label: "分组", icon: <Users size={16} aria-hidden /> },
    { value: "tags", label: "标签", icon: <Tags size={16} aria-hidden /> }
  ];
  return (
    <div className="admin-view-tabs" role="tablist" aria-label="生日记录视图">
      {options.map((option) => (
        <button
          key={option.value}
          className={value === option.value ? "active" : ""}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AdminFacetView({
  records,
  kind,
  onApply
}: {
  records: BirthdayView[];
  kind: "group" | "tag";
  onApply: (value: string) => void;
}) {
  const rows = useMemo(() => buildFacetRows(records, kind), [kind, records]);
  if (rows.length === 0) {
    return <EmptyState title={kind === "group" ? "暂无分组" : "暂无标签"} />;
  }
  return (
    <div className="facet-grid">
      {rows.map((row) => (
        <button
          className="facet-item"
          key={row.name}
          type="button"
          onClick={() => onApply(row.name === "未分组" || row.name === "无标签" ? "" : row.name)}
        >
          <span>{row.name}</span>
          <strong>{row.count}</strong>
          <small>
            公开 {row.visible} · 隐藏 {row.hidden} · 30天内 {row.upcoming30}
          </small>
          {row.examples.length > 0 ? <em>{row.examples.join("、")}</em> : null}
        </button>
      ))}
    </div>
  );
}

function ImportExportPage() {
  const [csv, setCsv] = useState("");
  const [jsonImport, setJsonImport] = useState("");
  const [jsonMode, setJsonMode] = useState<JsonImportMode>("append");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [lastImportUndo, setLastImportUndo] = useState<{ ids: string[]; label: string } | undefined>();
  const [selectedFileName, setSelectedFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | undefined>();
  const [jsonPreview, setJsonPreview] = useState<ImportPreview | undefined>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const templateHref = useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate())}`,
    []
  );

  const handleFile = async (file?: File) => {
    if (!file) {
      return;
    }
    setSelectedFileName(file.name);
    setCsv(await file.text());
    setPreview(undefined);
    setLastImportUndo(undefined);
    setMessage("");
    setError("");
  };

  const handlePreview = async () => {
    setError("");
    try {
      const result = await api.previewCsv(csv, { skipDuplicates });
      setPreview(result.preview);
      setLastImportUndo(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "CSV 校验失败");
    }
  };

  const handleImport = async () => {
    setError("");
    try {
      const result = await api.importCsv(csv, { skipDuplicates });
      setPreview(result.preview);
      setLastImportUndo(
        result.created.length > 0
          ? { ids: result.created.map((item) => item.id), label: "CSV 导入" }
          : undefined
      );
      setMessage(importResultMessage(result.created.length, result.preview.skippedCount));
    } catch (err) {
      setError(err instanceof Error ? err.message : "导入失败");
    }
  };

  const handleJsonPreview = async () => {
    setError("");
    try {
      const result = await api.previewJson(jsonImport, jsonMode, { skipDuplicates });
      setJsonPreview(result.preview);
      setLastImportUndo(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON 校验失败");
    }
  };

  const handleJsonImport = async () => {
    setError("");
    if (
      jsonMode === "replace" &&
      !window.confirm("确认用 JSON 内容替换全部生日记录吗？当前记录会被清空。")
    ) {
      return;
    }
    try {
      const result = await api.importJson(jsonImport, jsonMode, { skipDuplicates });
      setJsonPreview(result.preview);
      setLastImportUndo(
        result.mode === "append" && result.created.length > 0
          ? { ids: result.created.map((item) => item.id), label: "JSON 追加" }
          : undefined
      );
      setMessage(
        result.mode === "replace"
          ? `已恢复 ${result.created.length} 条记录`
          : importResultMessage(result.created.length, result.preview.skippedCount)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "JSON 导入失败");
    }
  };

  const handleUndoLastImport = async () => {
    if (!lastImportUndo || !window.confirm(`确认撤回本次${lastImportUndo.label}的 ${lastImportUndo.ids.length} 条记录吗？`)) {
      return;
    }
    setError("");
    try {
      const result = await api.batchBirthdays({ ids: lastImportUndo.ids, action: "delete" });
      setLastImportUndo(undefined);
      setMessage(`已撤回 ${result.count} 条记录`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "撤回失败");
    }
  };

  return (
    <div className="admin-flow">
      <AdminTitle title="导入备份" />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {lastImportUndo ? (
        <div className="undo-import-bar">
          <span>{lastImportUndo.label}刚新增 {lastImportUndo.ids.length} 条记录</span>
          <button className="secondary-button danger-text" type="button" onClick={handleUndoLastImport}>
            <RotateCcw size={16} aria-hidden />
            撤回本次导入
          </button>
        </div>
      ) : null}
      <section className="admin-section import-grid">
        <div className="upload-box">
          <FileUp size={28} aria-hidden />
          <label className="file-picker" htmlFor="birthday-csv-upload">
            <Upload size={17} aria-hidden />
            选择 CSV 文件
          </label>
          <input
            id="birthday-csv-upload"
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <span className="file-name">{selectedFileName || "未选择文件"}</span>
        </div>
        <label className="import-text-field" htmlFor="csv-import-textarea">
          <span>CSV 内容</span>
          <textarea
            id="csv-import-textarea"
            value={csv}
            onChange={(event) => {
              setCsv(event.target.value);
              setPreview(undefined);
              setLastImportUndo(undefined);
            }}
            placeholder="name,calendarType,birthday,year,month,day,isLeapMonth,leapMonthPolicy,displayAge,group,tags,note,visible"
          />
        </label>
        <ImportOptionsBar skipDuplicates={skipDuplicates} onSkipDuplicatesChange={setSkipDuplicates} />
        <div className="button-row">
          <button className="secondary-button" onClick={handlePreview}>
            <Check size={17} aria-hidden />
            校验
          </button>
          <button className="primary-button" onClick={handleImport}>
            <Upload size={17} aria-hidden />
            导入
          </button>
          <a className="secondary-button" href={adminExportUrl("csv")}>
            <Download size={17} aria-hidden />
            CSV
          </a>
          <a className="secondary-button" href={adminExportUrl("json")}>
            <Download size={17} aria-hidden />
            JSON
          </a>
          <a
            className="secondary-button"
            href={templateHref}
            download="birthday-template.csv"
          >
            <Download size={17} aria-hidden />
            模板
          </a>
          <button
            className="ghost-button"
            type="button"
            onClick={() => {
              setCsv(csvTemplate());
              setPreview(undefined);
              setMessage("已填入 CSV 模板");
            }}
          >
            <Plus size={17} aria-hidden />
            填入模板
          </button>
        </div>
      </section>
      {preview ? <ImportPreviewTable preview={preview} title="CSV 校验结果" /> : null}
      <section className="admin-section json-import-panel">
        <SectionTitle title="JSON 恢复" />
        <div className="json-import-controls">
          <CustomSelect
            ariaLabel="JSON 恢复模式"
            value={jsonMode}
            onChange={setJsonMode}
            options={[
              { value: "append", label: "追加导入" },
              { value: "replace", label: "替换全部" }
            ]}
          />
          <button className="secondary-button" type="button" onClick={handleJsonPreview}>
            <Check size={17} aria-hidden />
            校验 JSON
          </button>
          <button className="primary-button" type="button" onClick={handleJsonImport}>
            <Upload size={17} aria-hidden />
            执行恢复
          </button>
        </div>
        <label className="import-text-field" htmlFor="json-import-textarea">
          <span>JSON 内容</span>
          <textarea
            id="json-import-textarea"
            value={jsonImport}
            onChange={(event) => {
              setJsonImport(event.target.value);
              setJsonPreview(undefined);
              setLastImportUndo(undefined);
            }}
            placeholder='{"birthdays":[{"name":"小玉","calendarType":"新历","birthday":"1月28日"}]}'
          />
        </label>
        <ImportOptionsBar skipDuplicates={skipDuplicates} onSkipDuplicatesChange={setSkipDuplicates} />
      </section>
      {jsonPreview ? <ImportPreviewTable preview={jsonPreview} title="JSON 校验结果" /> : null}
    </div>
  );
}

function ImportOptionsBar({
  skipDuplicates,
  onSkipDuplicatesChange
}: {
  skipDuplicates: boolean;
  onSkipDuplicatesChange: (value: boolean) => void;
}) {
  return (
    <div className="import-options-bar">
      <label className="check-line">
        <input
          type="checkbox"
          checked={skipDuplicates}
          onChange={(event) => onSkipDuplicatesChange(event.target.checked)}
        />
        跳过重复记录
      </label>
    </div>
  );
}

function importResultMessage(createdCount: number, skippedCount: number): string {
  return skippedCount > 0
    ? `已导入 ${createdCount} 条记录，跳过 ${skippedCount} 条重复记录`
    : `已导入 ${createdCount} 条记录`;
}

function AdminSettingsPage() {
  const settings = useAdminSettings();
  const [form, setForm] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings.data) {
      setForm(settings.data);
    }
  }, [settings.data]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await api.updateSettings(form);
      setForm(result.settings);
      setMessage("设置已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-flow">
      <AdminTitle title="设置" />
      {message ? <Notice tone="success">{message}</Notice> : null}
      {error || settings.error ? (
        <Notice tone="danger">{error || settings.error}</Notice>
      ) : null}
      <form className="admin-section settings-form" onSubmit={handleSave}>
        <label>
          站点名称
          <input
            value={form.siteName}
            onChange={(event) => setForm((current) => ({ ...current, siteName: event.target.value }))}
          />
        </label>
        <label>
          默认近期天数
          <input
            inputMode="numeric"
            min={1}
            max={366}
            type="number"
            value={form.defaultUpcomingDays}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                defaultUpcomingDays: Number(event.target.value)
              }))
            }
          />
        </label>
        <label className="wide-field">
          公开纠错说明
          <textarea
            value={form.correctionContact}
            onChange={(event) =>
              setForm((current) => ({ ...current, correctionContact: event.target.value }))
            }
          />
        </label>
        <div className="wide-field template-field">
          <span className="field-heading">
            <label htmlFor="birthday-greeting-templates">生日祝福模板</label>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setForm((current) => ({
                  ...current,
                  birthdayGreetingTemplates: [...DEFAULT_SITE_SETTINGS.birthdayGreetingTemplates]
                }));
                setMessage("已恢复默认祝福模板，保存后生效");
                setError("");
              }}
            >
              <RotateCcw size={16} aria-hidden />
              恢复默认
            </button>
          </span>
          <textarea
            id="birthday-greeting-templates"
            value={form.birthdayGreetingTemplates.join("\n")}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                birthdayGreetingTemplates: templatesFromTextarea(event.target.value)
              }))
            }
            placeholder="祝 {names} 生日快乐！"
          />
          <small className="field-hint">
            当前 {form.birthdayGreetingTemplates.length} / 30 条，每行一条。
          </small>
        </div>
        <div className="settings-grid">
          <SettingLine label="访问路径" value="/xingxing" />
          <SettingLine label="后台路径" value="/xingxing/admin" />
          <SettingLine label="API 路径" value="/xingxing/api" />
          <SettingLine label="默认时区" value="Asia/Shanghai" />
        </div>
        <button className="primary-button" disabled={saving || settings.loading}>
          <Save size={17} aria-hidden />
          {saving ? "保存中" : "保存设置"}
        </button>
      </form>
    </div>
  );
}

function BirthdayForm({
  editing,
  records,
  onSave,
  onCancel
}: {
  editing?: BirthdayView;
  records: BirthdayView[];
  onSave: (input: BirthdayInput, options?: BirthdayWriteOptions) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<BirthdayFormState>(
    editing ? formFromBirthday(editing) : emptyForm
  );
  const [advancedOpen, setAdvancedOpen] = useState(() =>
    editing ? hasAdvancedFormValues(formFromBirthday(editing)) : false
  );
  const [preview, setPreview] = useState<BirthdayView | undefined>();
  const [previewError, setPreviewError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof BirthdayFormState>(key: K, value: BirthdayFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const duplicateInfo = useMemo(
    () => duplicateInfoForForm(form, records, editing?.id),
    [editing?.id, form, records]
  );

  useEffect(() => {
    if (!form.name.trim() || !form.month.trim() || !form.day.trim()) {
      setPreview(undefined);
      setPreviewError("");
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      api
        .previewBirthday(formToInput(form))
        .then((result) => {
          if (active) {
            setPreview(result.birthday);
            setPreviewError("");
          }
        })
        .catch((err) => {
          if (active) {
            setPreview(undefined);
            setPreviewError(err instanceof Error ? err.message : "日期暂不可预览");
          }
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [form]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const allowDuplicate = duplicateInfo.exact.length > 0;
    if (allowDuplicate) {
      if (!hasDuplicateDistinguishingInfo(form)) {
        setAdvancedOpen(true);
        window.alert("已有同名同日期记录。若确实是不同的人，请先填写分组、标签或备注用于区分。");
        return;
      }
      if (!window.confirm("已有同名同日期记录，确认作为不同的人保留吗？")) {
        return;
      }
    }
    setSubmitting(true);
    try {
      await onSave(formToInput(form), { allowDuplicate });
      setForm(emptyForm);
      setAdvancedOpen(false);
    } catch {
      // Parent pages own the user-facing error message; keep current form values intact.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-section birthday-form" onSubmit={handleSubmit}>
      <SectionTitle
        title={editing ? "编辑生日" : "新增生日"}
        action={
          editing ? (
            <button type="button" className="icon-button" onClick={onCancel} aria-label="取消编辑">
              <X size={17} aria-hidden />
            </button>
          ) : null
        }
      />
      {editing ? (
        <div className="edit-context">
          <span>正在编辑</span>
          <strong>{editing.name}</strong>
          <small>{editing.originalDateText}</small>
        </div>
      ) : null}
      {editing ? <RecordStoragePanel birthday={editing} /> : null}
      <div className="form-grid">
        <label>
          姓名
          <input value={form.name} onChange={(event) => set("name", event.target.value)} />
        </label>
        <div className="field-label">
          <span>类型</span>
          <CustomSelect
            ariaLabel="生日类型"
            value={form.calendarType}
            onChange={(value) => set("calendarType", value)}
            options={[
              { value: "gregorian", label: "公历" },
              { value: "lunar", label: "农历" }
            ]}
          />
        </div>
        <label>
          月
          <input
            inputMode="numeric"
            min={1}
            max={12}
            type="number"
            value={form.month}
            onChange={(event) => set("month", event.target.value)}
          />
        </label>
        <label>
          日
          <input
            inputMode="numeric"
            min={1}
            max={31}
            type="number"
            value={form.day}
            onChange={(event) => set("day", event.target.value)}
          />
        </label>
      </div>
      <DuplicateNameNotice info={duplicateInfo} />
      <button
        className="secondary-button advanced-toggle"
        type="button"
        onClick={() => setAdvancedOpen((current) => !current)}
      >
        <Settings size={17} aria-hidden />
        {advancedOpen ? "收起更多设置" : "更多设置"}
      </button>
      {advancedOpen ? (
        <div className="form-grid advanced-fields">
          <label>
            年份
            <input
              inputMode="numeric"
              min={1}
              max={9999}
              type="number"
              value={form.year}
              onChange={(event) => set("year", event.target.value)}
              placeholder="可不填"
            />
          </label>
          {form.calendarType === "lunar" ? (
            <>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={form.isLeapMonth}
                  onChange={(event) => set("isLeapMonth", event.target.checked)}
                />
                闰月
              </label>
              {form.isLeapMonth ? (
                <div className="field-label">
                  <span>闰月规则</span>
                  <CustomSelect
                    ariaLabel="闰月规则"
                    value={form.leapMonthPolicy}
                    onChange={(value) => set("leapMonthPolicy", value)}
                    options={[
                      { value: "normalMonthIfNoLeap", label: "无闰月按普通月" },
                      { value: "onlyLeapMonth", label: "只在闰月年份展示" }
                    ]}
                  />
                </div>
              ) : null}
            </>
          ) : null}
          <label>
            分组
            <input value={form.group} onChange={(event) => set("group", event.target.value)} />
          </label>
          <label>
            标签
            <input
              value={form.tags}
              onChange={(event) => set("tags", event.target.value)}
              placeholder="用 | 分隔"
            />
          </label>
          <label className="wide-field">
            备注
            <textarea value={form.note} onChange={(event) => set("note", event.target.value)} />
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={form.displayAge}
              onChange={(event) => set("displayAge", event.target.checked)}
            />
            展示年龄
          </label>
          <label className="check-line">
            <input
              type="checkbox"
              checked={form.visible}
              onChange={(event) => set("visible", event.target.checked)}
            />
            公开显示
          </label>
        </div>
      ) : null}
      <BirthdayPreviewPanel preview={preview} error={previewError} />
      <button className="primary-button" disabled={submitting}>
        <Save size={17} aria-hidden />
        {submitting ? "保存中" : "保存"}
      </button>
    </form>
  );
}

function BirthdayPreviewPanel({
  preview,
  error
}: {
  preview?: BirthdayView;
  error: string;
}) {
  if (error) {
    return <div className="form-preview error">{error}</div>;
  }
  if (!preview) {
    return <div className="form-preview muted">填写姓名、月份和日期后显示预览</div>;
  }
  return (
    <div className="form-preview">
      <span>公开预览</span>
      <strong>{preview.name || "未命名"}</strong>
      <small>
        {birthdayDateText(preview)} · 下次 {preview.occurrenceDateText} ·{" "}
        {formatCountdown(preview.occurrence?.daysUntil)}
      </small>
      {preview.occurrence?.note ? <small>{preview.occurrence.note}</small> : null}
    </div>
  );
}

function DuplicateNameNotice({ info }: { info: DuplicateFormInfo }) {
  if (info.sameName.length === 0) {
    return null;
  }
  const exact = info.exact.length > 0;
  const examples = info.sameName.slice(0, 3).map(duplicateRecordSummary).join("；");
  return (
    <div className={`duplicate-notice ${exact ? "strong" : ""}`}>
      <strong>{exact ? "发现同名同日期记录" : "已有同名记录"}</strong>
      <small>
        {exact
          ? "保存前会再次确认。若确实是不同的人，建议补充分组或备注。"
          : "同名可以保留，但建议补充分组、标签或备注，方便公开列表和后台维护时区分。"}
      </small>
      <span>{examples}</span>
    </div>
  );
}

function RecordStoragePanel({ birthday }: { birthday: BirthdayView }) {
  const fields = recordStorageFields(birthday);
  return (
    <details className="record-storage-panel">
      <summary>
        <span>
          <Info size={15} aria-hidden />
          数据库存储摘要
        </span>
        <small>birthday_people</small>
      </summary>
      <dl className="record-storage-grid">
        {fields.map((field) => (
          <div className="storage-field" key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function BirthdayGrid({
  birthdays,
  fillRowColumns = 0,
  loading
}: {
  birthdays: PublicBirthday[];
  fillRowColumns?: number;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="birthday-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="birthday-card skeleton" key={index} />
        ))}
      </div>
    );
  }
  if (birthdays.length === 0) {
    return <EmptyState title="没有匹配的生日" />;
  }
  const placeholderCount =
    fillRowColumns > 1 ? (fillRowColumns - (birthdays.length % fillRowColumns)) % fillRowColumns : 0;
  return (
    <div className="birthday-grid">
      {birthdays.map((birthday) => (
        <BirthdayCard key={birthday.id} birthday={birthday} />
      ))}
      {Array.from({ length: placeholderCount }, (_, index) => (
        <div className="birthday-card-placeholder" aria-hidden="true" key={`placeholder-${index}`} />
      ))}
    </div>
  );
}

function BirthdayCalendarView({
  birthdays,
  loading
}: {
  birthdays: PublicBirthday[];
  loading: boolean;
}) {
  const monthGroups = useMemo(() => buildBirthdayCalendarMonths(birthdays), [birthdays]);
  if (loading) {
    return (
      <div className="birthday-calendar-board">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="birthday-calendar-month skeleton" key={index} />
        ))}
      </div>
    );
  }
  if (birthdays.length === 0) {
    return <EmptyState title="没有匹配的生日" />;
  }
  if (monthGroups.length === 0) {
    return <EmptyState title="暂无可展示的日历日期" />;
  }
  return (
    <div className="birthday-calendar-board">
      {monthGroups.map((month) => (
        <section className="birthday-calendar-month" key={`${month.year}-${month.month}`}>
          <header>
            <div>
              <strong>{month.month}月</strong>
              <span>{month.year}</span>
            </div>
            <small>{month.count} 人</small>
          </header>
          <div className="calendar-weekdays" aria-hidden>
            {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-days">
            {month.cells.map((cell) => {
              const visibleBirthdays = cell.birthdays.slice(0, 2);
              const extra = cell.birthdays.length - visibleBirthdays.length;
              return (
                <div
                  className={[
                    "calendar-day",
                    cell.day ? "" : "empty",
                    cell.isToday ? "is-today" : "",
                    cell.birthdays.length > 0 ? "has-birthday" : "",
                    cell.birthdays.some((birthday) => birthday.occurrence?.daysUntil === 0)
                      ? "today-birthday"
                      : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  key={cell.key}
                >
                  {cell.day ? <span className="calendar-day-number">{cell.day}</span> : null}
                  {visibleBirthdays.map((birthday) => (
                    <small key={birthday.id} title={birthdayDateText(birthday)}>
                      {birthday.name}
                    </small>
                  ))}
                  {extra > 0 ? <em>+{extra}</em> : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function BirthdayCard({ birthday }: { birthday: PublicBirthday }) {
  const days = birthday.occurrence?.daysUntil;
  return (
    <article className={`birthday-card ${days === 0 ? "today-birthday" : ""}`}>
      <div className="card-topline">
        <span className="countdown">{formatCountdown(days)}</span>
      </div>
      <div className="card-name">
        <h3>{birthday.name}</h3>
        {birthday.group ? <small>{birthday.group}</small> : null}
      </div>
      <p className="date-pair">
        <span>{birthdayDateText(birthday)}</span>
        <span>下次 {birthday.occurrenceDateText}</span>
      </p>
      {birthday.occurrence?.note ? <p className="note-line">{birthday.occurrence.note}</p> : null}
      <MetaLine birthday={birthday} />
    </article>
  );
}

function BirthdaySpotlight({ birthday }: { birthday: PublicBirthday }) {
  return (
    <article className="spotlight-card today-birthday">
      <span className="spotlight-star" aria-hidden="true" />
      <div className="spotlight-copy">
        <strong>{birthday.name}</strong>
        <small>{birthdayDateText(birthday)}</small>
      </div>
    </article>
  );
}

function BirthdayGreetingBox({
  greeting,
  onShuffle
}: {
  greeting: string;
  onShuffle: () => void;
}) {
  return (
    <div className="greeting-box">
      <div>
        <span>
          <Sparkles size={14} aria-hidden />
          今日祝福
        </span>
        <p>{greeting}</p>
      </div>
      <button className="ghost-button" type="button" onClick={onShuffle}>
        换一句
      </button>
    </div>
  );
}

function CompactBirthday({ birthday }: { birthday: PublicBirthday }) {
  return (
    <article className={`compact-birthday ${birthday.occurrence?.daysUntil === 0 ? "today-birthday" : ""}`}>
      <strong>{birthday.name}</strong>
      <span className="compact-date">
        <span>{birthdayDateText(birthday)}</span>
        <small>下次 {birthday.occurrenceDateText}</small>
      </span>
    </article>
  );
}

function birthdayDateText(birthday: Pick<PublicBirthday, "calendarLabel" | "originalDateText">) {
  return `${birthday.calendarLabel} ${birthday.originalDateText.replace(/^\d{1,4}年/, "")}`;
}

type BirthdayCalendarCell = {
  key: string;
  day?: number;
  isToday?: boolean;
  birthdays: PublicBirthday[];
};

type BirthdayCalendarMonth = {
  year: number;
  month: number;
  count: number;
  cells: BirthdayCalendarCell[];
};

function buildBirthdayCalendarMonths(birthdays: PublicBirthday[]): BirthdayCalendarMonth[] {
  const groups = new Map<string, PublicBirthday[]>();
  for (const birthday of birthdays) {
    const date = birthday.occurrence?.date;
    if (!date) {
      continue;
    }
    const key = `${date.year}-${date.month}`;
    groups.set(key, [...(groups.get(key) ?? []), birthday]);
  }

  return Array.from(groups.entries())
    .map(([key, records]) => {
      const [year, month] = key.split("-").map(Number);
      return {
        year,
        month,
        records: records.sort(
          (left, right) =>
            (left.occurrence?.date.day ?? 0) - (right.occurrence?.date.day ?? 0) ||
            left.name.localeCompare(right.name, "zh-CN")
        )
      };
    })
    .sort((left, right) => left.year - right.year || left.month - right.month)
    .map(({ year, month, records }) => {
      const byDay = new Map<number, PublicBirthday[]>();
      for (const record of records) {
        const day = record.occurrence?.date.day;
        if (!day) {
          continue;
        }
        byDay.set(day, [...(byDay.get(day) ?? []), record]);
      }
      return {
        year,
        month,
        count: records.length,
        cells: buildCalendarCells(year, month, byDay)
      };
    });
}

function buildCalendarCells(
  year: number,
  month: number,
  byDay: Map<number, PublicBirthday[]>
): BirthdayCalendarCell[] {
  const today = new Date();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: BirthdayCalendarCell[] = [];
  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push({ key: `empty-start-${index}`, birthdays: [] });
  }
  for (let day = 1; day <= dayCount; day += 1) {
    cells.push({
      key: String(day),
      day,
      isToday:
        today.getFullYear() === year &&
        today.getMonth() + 1 === month &&
        today.getDate() === day,
      birthdays: byDay.get(day) ?? []
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-end-${cells.length}`, birthdays: [] });
  }
  return cells;
}

function MetaLine({ birthday }: { birthday: PublicBirthday }) {
  const items = [
    birthday.group,
    birthday.age !== undefined ? `${birthday.age} 岁` : undefined,
    ...birthday.tags
  ].filter(Boolean);
  if (items.length === 0) {
    return null;
  }
  return (
    <div className="meta-line">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function AdminTable({
  birthdays,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onVisibility
}: {
  birthdays: BirthdayView[];
  selectedIds?: Set<string>;
  onSelect?: (id: string, checked: boolean) => void;
  onSelectAll?: (ids: string[], checked: boolean) => void;
  onEdit?: (birthday: BirthdayView) => void;
  onDelete?: (birthday: BirthdayView) => void;
  onVisibility?: (birthday: BirthdayView) => void;
}) {
  if (birthdays.length === 0) {
    return <EmptyState title="暂无记录" />;
  }
  const selectable = Boolean(selectedIds && onSelect && onSelectAll);
  const visibleIds = birthdays.map((item) => item.id);
  const allSelected =
    selectable && visibleIds.length > 0 && visibleIds.every((id) => selectedIds?.has(id));
  return (
    <div className="table-wrap">
      <table className="admin-table birthday-admin-table">
        <thead>
          <tr>
            <th>
              {selectable ? (
                <label className="table-select-all">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(event) => onSelectAll?.(visibleIds, event.target.checked)}
                  />
                  姓名
                </label>
              ) : (
                "姓名"
              )}
            </th>
            <th>生日</th>
            <th>下次日期</th>
            <th>倒计时</th>
            <th>公开</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {birthdays.map((item) => (
            <tr key={item.id}>
              <td className={selectable ? "person-cell selectable-person-cell" : "person-cell"} data-label="姓名">
                {selectable ? (
                  <label className="row-select-control">
                    <input
                      aria-label={`选择 ${item.name}`}
                      className="row-select-checkbox"
                      type="checkbox"
                      checked={selectedIds?.has(item.id) ?? false}
                      onChange={(event) => onSelect?.(item.id, event.target.checked)}
                    />
                    <span className="row-select-mark" aria-hidden />
                  </label>
                ) : null}
                <span className="person-cell-body">
                  <strong>{item.name}</strong>
                  <small>
                    {item.group ?? "未分组"}
                    <span className="mobile-row-state"> · {item.visible ? "公开" : "隐藏"}</span>
                  </small>
                  <small className="updated-line">
                    更新 {formatDateTime(item.updatedAt)}
                    {item.updatedBy ? ` · ${item.updatedBy}` : ""}
                  </small>
                </span>
              </td>
              <td data-label="生日">{birthdayDateText(item)}</td>
              <td data-label="下次日期">{item.occurrenceDateText}</td>
              <td data-label="倒计时">{formatCountdown(item.occurrence?.daysUntil)}</td>
              <td data-label="公开">{item.visible ? "显示" : "隐藏"}</td>
              <td data-label="操作">
                <div className="table-actions">
                  <button className="icon-button" onClick={() => onEdit?.(item)} aria-label="编辑">
                    <Pencil size={16} aria-hidden />
                  </button>
                  <button
                    className="icon-button"
                    onClick={() => onVisibility?.(item)}
                    aria-label={item.visible ? "隐藏" : "显示"}
                  >
                    {item.visible ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
                  <button className="icon-button danger" onClick={() => onDelete?.(item)} aria-label="删除">
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImportPreviewTable({
  preview,
  title = "校验结果"
}: {
  preview: ImportPreview;
  title?: string;
}) {
  return (
    <section className="admin-section">
      <SectionTitle title={`${title}：${preview.importableCount} 条将导入，${preview.skippedCount} 条会跳过`} />
      <ImportPreviewSummary preview={preview} />
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>行号</th>
              <th>姓名</th>
              <th>生日</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.rowNumber}>
                <td data-label="行号">{row.rowNumber}</td>
                <td data-label="姓名">{previewValue(row.input.name)}</td>
                <td data-label="生日">
                  {previewCalendarType(row.input.calendarType)} {previewValue(row.input.month)} / {previewValue(row.input.day)}
                </td>
                <td data-label="状态">{importPreviewStatus(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ImportPreviewSummary({ preview }: { preview: ImportPreview }) {
  const items = [
    { label: "将导入", value: preview.importableCount, tone: "ok" },
    { label: "会跳过", value: preview.skippedCount, tone: "warn" },
    { label: "有错误", value: preview.invalidCount, tone: "bad" },
    { label: "库内疑似重复", value: preview.duplicateExistingCount, tone: "warn" },
    { label: "文件内重复", value: preview.duplicateInImportCount, tone: "warn" }
  ];
  return (
    <div className="import-preview-summary" aria-label="导入预览摘要">
      {items.map((item) => (
        <div className={`import-preview-stat ${item.tone}`} key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </div>
  );
}

function importPreviewStatus(row: ImportPreview["rows"][number]) {
  if (row.errors.length > 0) {
    return <span className="table-error">{row.errors.join("；")}</span>;
  }
  if (row.skipped) {
    const reason = row.duplicateCandidate
      ? `库内已有：${row.duplicateCandidate.name}`
      : row.duplicateInImportRow
        ? `与第 ${row.duplicateInImportRow} 行重复`
        : "重复记录";
    return <span className="table-warn">将跳过：{reason}</span>;
  }
  const warnings = [
    row.duplicateCandidate ? `可能重复：${row.duplicateCandidate.name}` : undefined,
    row.duplicateInImportRow ? `与第 ${row.duplicateInImportRow} 行重复` : undefined
  ].filter(Boolean);
  if (warnings.length > 0) {
    return <span className="table-warn">{warnings.join("；")}</span>;
  }
  return <span className="table-ok">可导入</span>;
}

function previewValue(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  return String(value);
}

function previewCalendarType(value: unknown): string {
  if (value === "gregorian") {
    return "公历";
  }
  if (value === "lunar") {
    return "农历";
  }
  return previewValue(value);
}

function useLoad<T>(load: () => Promise<T>, deps: DependencyList = []): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ loading: true });
  useEffect(() => {
    let active = true;
    load()
      .then((data) => active && setState({ loading: false, data }))
      .catch(
        (error) =>
          active &&
          setState({
            loading: false,
            error: error instanceof Error ? error.message : "读取失败"
          })
      );
    return () => {
      active = false;
    };
  }, deps);
  return state;
}

function usePublicBirthdays(): LoadState<PublicBirthday[]> {
  return useLoad(() => api.publicBirthdays().then((result) => result.birthdays));
}

function useTodayInfo(): LoadState<TodayDateInfo> {
  return useLoad(() => api.publicToday().then((result) => result.today));
}

function usePublicSettings(): LoadState<PublicSettings> {
  return useLoad(() => api.publicSettings());
}

function useAdminBirthdayData() {
  const [records, setRecords] = useState<BirthdayView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const load = async (options: { keepLoading?: boolean } = {}) => {
    if (!options.keepLoading) {
      setLoading(true);
    }
    try {
      const result = await api.adminBirthdays();
      setRecords(result.birthdays);
      setError(undefined);
      return result.birthdays;
    } catch (err) {
      const message = err instanceof Error ? err.message : "读取失败";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    api
      .adminBirthdays()
      .then((result) => {
        if (active) {
          setRecords(result.birthdays);
          setError(undefined);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "读取失败");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => summarizeAdminBirthdays(records), [records]);

  return {
    data: records,
    records,
    loading,
    error,
    refresh: () => load({ keepLoading: true }),
    summary
  };
}

function useAdminOperationLogs(limit = 80): LoadState<AdminOperationLog[]> {
  return useLoad(() => api.adminOperationLogs(limit).then((result) => result.logs), [limit]);
}

function useAdminDataAudit(): LoadState<DataAuditReport> {
  return useLoad(() => api.adminDataAudit().then((result) => result.audit));
}

function useAdminSettings(): LoadState<SiteSettings> {
  return useLoad(() => api.adminSettings().then((result) => result.settings));
}

function PageTitle({ eyebrow, title, meta }: { eyebrow?: string; title: string; meta?: string }) {
  return (
    <header className="page-title">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="page-title-row">
        <h1>{title}</h1>
        {meta ? <span className="page-title-meta">{meta}</span> : null}
      </div>
    </header>
  );
}

function AdminTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <header className="admin-title">
      <h1>{title}</h1>
      <div className="admin-title-actions">
        {action}
        <Link className="secondary-button" to="/">
          <Eye size={17} aria-hidden />
          查看前台
        </Link>
      </div>
    </header>
  );
}

function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

function AdminStatusRail({
  summary,
  loading
}: {
  summary: AdminBirthdaySummary;
  loading: boolean;
}) {
  const items = [
    { label: "库内", value: loading ? "..." : summary.total },
    { label: "公开", value: loading ? "..." : summary.total - summary.hidden },
    { label: "隐藏", value: loading ? "..." : summary.hidden },
    { label: "复核", value: loading ? "..." : summary.duplicateRecordCount + summary.lunarAttention }
  ];
  return (
    <section className="admin-status-rail" aria-label="生日库状态">
      {items.map((item) => (
        <div key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}
    </section>
  );
}

function OperationLogList({
  logs,
  loading,
  error
}: {
  logs: AdminOperationLog[];
  loading: boolean;
  error?: string;
}) {
  if (loading) {
    return <InlineLoading />;
  }
  if (error) {
    return <Notice tone="danger">{error}</Notice>;
  }
  if (logs.length === 0) {
    return <EmptyState title="暂无操作记录" />;
  }
  return (
    <div className="operation-log-list">
      {logs.map((log) => {
        const detail = formatLogDetail(log.detail);
        return (
          <article className="operation-log-item" key={log.id}>
            <span>{operationActionLabel(log.action)}</span>
            <strong>{log.entityName ?? operationEntityLabel(log.entityType)}</strong>
            <small>
              {log.actorName ?? "系统"} · {formatLogTimestamp(log.createdAt)}
            </small>
            {detail ? <em>{detail}</em> : null}
          </article>
        );
      })}
    </div>
  );
}

function SettingLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return <div className="empty-state">{title}</div>;
}

function InlineLoading() {
  return <div className="empty-state">加载中</div>;
}

function LoadingScreen({ label }: { label: string }) {
  return <main className="loading-screen">{label}</main>;
}

function Notice({ children, tone }: { children: ReactNode; tone: "danger" | "success" }) {
  return <div className={`notice ${tone}`}>{children}</div>;
}

function summarizeAdminBirthdays(records: BirthdayView[]): AdminBirthdaySummary {
  const duplicateKeys = duplicateKeySet(records);
  return {
    total: records.length,
    hidden: records.filter((item) => !item.visible).length,
    lunarAttention: records.filter((item) => item.calendarType === "lunar" && item.isLeapMonth)
      .length,
    duplicateKeyCount: duplicateKeys.size,
    duplicateRecordCount: records.filter((item) => duplicateKeys.has(birthdayDuplicateKey(item)))
      .length
  };
}

type FacetRow = {
  name: string;
  count: number;
  visible: number;
  hidden: number;
  upcoming30: number;
  examples: string[];
};

function buildFacetRows(records: BirthdayView[], kind: "group" | "tag"): FacetRow[] {
  const rows = new Map<string, FacetRow>();
  const add = (name: string, record: BirthdayView) => {
    const row =
      rows.get(name) ??
      {
        name,
        count: 0,
        visible: 0,
        hidden: 0,
        upcoming30: 0,
        examples: []
      };
    row.count += 1;
    row.visible += record.visible ? 1 : 0;
    row.hidden += record.visible ? 0 : 1;
    row.upcoming30 += matchRange(record, "30") ? 1 : 0;
    if (row.examples.length < 4) {
      row.examples.push(record.name);
    }
    rows.set(name, row);
  };

  for (const record of records) {
    if (kind === "group") {
      add(record.group || "未分组", record);
      continue;
    }
    const tags = record.tags.length > 0 ? record.tags : ["无标签"];
    for (const tag of tags) {
      add(tag, record);
    }
  }

  return Array.from(rows.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
}

function uniqueSortedValues(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "zh-CN")
  );
}

function parseAdminTagInput(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[;|,，、\n]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function confirmAdminBatchRequest(request: AdminBatchRequest, count: number): boolean {
  if (request.action === "delete") {
    return window.confirm(`确认删除已选 ${count} 条生日记录吗？`);
  }
  if (request.action === "setGroup") {
    return window.confirm(`确认把已选 ${count} 条记录设置为「${request.group}」分组吗？这会覆盖原分组。`);
  }
  if (request.action === "clearGroup") {
    return window.confirm(`确认清除已选 ${count} 条记录的分组吗？`);
  }
  if (request.action === "clearTags") {
    return window.confirm(`确认清空已选 ${count} 条记录的全部标签吗？`);
  }
  return true;
}

function adminBatchResultMessage(request: AdminBatchRequest, count: number): string {
  if (count === 0) {
    return "所选记录无需更新";
  }
  return `已批量${adminBatchActionText(request)} ${count} 条记录`;
}

function adminBatchActionText(request: AdminBatchRequest): string {
  switch (request.action) {
    case "show":
      return "公开";
    case "hide":
      return "隐藏";
    case "delete":
      return "删除";
    case "setGroup":
      return `设置分组「${request.group}」`;
    case "clearGroup":
      return "清除分组";
    case "addTags":
      return `添加标签「${request.tags.join("、")}」`;
    case "removeTags":
      return `移除标签「${request.tags.join("、")}」`;
    case "clearTags":
      return "清空标签";
  }
}

function operationActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create_birthday: "新增生日",
    update_birthday: "更新生日",
    delete_birthday: "删除生日",
    show_birthday: "公开生日",
    hide_birthday: "隐藏生日",
    batch_show_birthday: "批量公开",
    batch_hide_birthday: "批量隐藏",
    batch_delete_birthday: "批量删除",
    batch_set_group: "批量设置分组",
    batch_clear_group: "批量清除分组",
    batch_add_tags: "批量添加标签",
    batch_remove_tags: "批量移除标签",
    batch_clear_tags: "批量清空标签",
    replace_birthdays: "替换生日库",
    import_csv_birthdays: "CSV 导入",
    import_json_append: "JSON 追加",
    import_json_replace: "JSON 替换",
    update_settings: "更新设置"
  };
  return labels[action] ?? action;
}

function operationEntityLabel(entityType: string): string {
  const labels: Record<string, string> = {
    birthday: "生日记录",
    birthday_batch: "多条生日记录",
    site_settings: "站点设置"
  };
  return labels[entityType] ?? entityType;
}

function formatLogDetail(detail?: string): string {
  if (!detail) {
    return "";
  }
  try {
    const parsed = JSON.parse(detail) as {
      count?: number;
      names?: string[];
      templates?: number;
      defaultUpcomingDays?: number;
      previousName?: string;
      changedFields?: string[];
      group?: string;
      tags?: string[];
    };
    const parts = [
      parsed.changedFields?.length ? `修改：${parsed.changedFields.join("、")}` : undefined,
      parsed.count !== undefined ? `${parsed.count} 条` : undefined,
      parsed.group ? `分组：${parsed.group}` : undefined,
      parsed.tags?.length ? `标签：${parsed.tags.join("、")}` : undefined,
      parsed.names?.length ? parsed.names.join("、") : undefined,
      parsed.templates !== undefined ? `${parsed.templates} 条祝福模板` : undefined,
      parsed.defaultUpcomingDays !== undefined ? `近期 ${parsed.defaultUpcomingDays} 天` : undefined,
      parsed.previousName ? `原姓名 ${parsed.previousName}` : undefined
    ].filter(Boolean);
    return parts.join(" · ");
  } catch {
    return detail;
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatLogTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (part: number, size = 2) => String(part).padStart(size, "0");
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`
  ].join(" ");
}

function formatCountdown(days?: number): string {
  if (days === undefined) {
    return "待计算";
  }
  if (days === 0) {
    return "今天";
  }
  return `${days} 天`;
}

function matchRange(item: { occurrence?: { daysUntil: number } }, range: RangeFilter): boolean {
  if (range === "all") {
    return true;
  }
  const days = item.occurrence?.daysUntil;
  if (typeof days !== "number") {
    return false;
  }
  if (range === "today") {
    return days === 0;
  }
  return days >= 0 && days <= Number(range);
}

function matchBirthdayQuery(
  item: Pick<
    BirthdayView,
    "name" | "group" | "note" | "originalDateText" | "occurrenceDateText" | "tags"
  >,
  normalized: string
): boolean {
  return (
    !normalized ||
    [item.name, item.group, item.note, item.originalDateText, item.occurrenceDateText, item.tags.join(" ")]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

function birthdayGreetingOptions(
  today: PublicBirthday[],
  templates: string[]
): string[] {
  if (today.length === 0) {
    return [];
  }
  const names = formatNameList(today.map((item) => item.name));
  const subject = today.length > 1 ? "你们" : "你";
  return templates.map((template) =>
    template
      .replaceAll("{names}", names)
      .replaceAll("{subject}", subject)
      .replaceAll("{count}", String(today.length))
  );
}

function formatNameList(names: string[]): string {
  if (names.length <= 2) {
    return names.join("、");
  }
  return `${names.slice(0, 2).join("、")} 等 ${names.length} 位星星`;
}

function templatesFromTextarea(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function duplicateKeySet(records: BirthdayView[]): Set<string> {
  const counts = new Map<string, number>();
  for (const item of records) {
    const key = birthdayDuplicateKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );
}

function birthdayDuplicateKey(item: Pick<BirthdayView, "name" | "calendarType" | "isLeapMonth" | "month" | "day">): string {
  return [
    normalizedPersonName(item.name),
    item.calendarType,
    item.isLeapMonth ? "leap" : "normal",
    item.month,
    item.day
  ].join("|");
}

type DuplicateFormInfo = {
  sameName: BirthdayView[];
  exact: BirthdayView[];
};

function duplicateInfoForForm(
  form: BirthdayFormState,
  records: BirthdayView[],
  editingId?: string
): DuplicateFormInfo {
  const nameKey = normalizedPersonName(form.name);
  if (!nameKey) {
    return { sameName: [], exact: [] };
  }
  const candidates = records.filter(
    (item) => item.id !== editingId && normalizedPersonName(item.name) === nameKey
  );
  const formKey = birthdayDuplicateKeyFromForm(form);
  return {
    sameName: candidates,
    exact: formKey ? candidates.filter((item) => birthdayDuplicateKey(item) === formKey) : []
  };
}

function birthdayDuplicateKeyFromForm(form: BirthdayFormState): string | undefined {
  const nameKey = normalizedPersonName(form.name);
  const month = Number(form.month);
  const day = Number(form.day);
  if (!nameKey || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }
  return [
    nameKey,
    form.calendarType,
    form.calendarType === "lunar" && form.isLeapMonth ? "leap" : "normal",
    month,
    day
  ].join("|");
}

function normalizedPersonName(value: string): string {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function duplicateRecordSummary(record: BirthdayView): string {
  return `${record.name}（${birthdayDateText(record)}${record.group ? `，${record.group}` : ""}）`;
}

function recordStorageFields(birthday: BirthdayView): Array<{ label: string; value: string }> {
  return [
    { label: "id", value: birthday.id },
    { label: "name", value: birthday.name },
    {
      label: "calendar_type",
      value: `${birthday.calendarType} / ${birthday.calendarLabel}`
    },
    { label: "year", value: storageOptional(birthday.year) },
    { label: "month / day", value: `${birthday.month} / ${birthday.day}` },
    { label: "is_leap_month", value: storageBoolean(birthday.isLeapMonth) },
    { label: "leap_month_policy", value: storageOptional(birthday.leapMonthPolicy) },
    { label: "display_age", value: storageBoolean(birthday.displayAge) },
    { label: "person_group", value: storageOptional(birthday.group) },
    { label: "tags_json", value: JSON.stringify(birthday.tags) },
    { label: "note", value: storageOptional(birthday.note) },
    { label: "visible", value: storageBoolean(birthday.visible) },
    { label: "created_at", value: birthday.createdAt },
    { label: "updated_at", value: birthday.updatedAt },
    { label: "updated_by", value: storageOptional(birthday.updatedBy) }
  ];
}

function storageOptional(value: string | number | undefined): string {
  return value === undefined || value === "" ? "NULL" : String(value);
}

function storageBoolean(value: boolean): string {
  return value ? "1 / true" : "0 / false";
}

function csvTemplate(): string {
  return [
    "name,calendarType,birthday,year,month,day,isLeapMonth,leapMonthPolicy,displayAge,group,tags,note,visible",
    "示例星星,新历,12月20日,,,,false,,false,星星,北斗星|生日,示例备注,true",
    "农历示例,农历,4月8日,,,,false,,false,家人,农历,农历生日示例,true",
    "闰月示例,农历,闰6月1日,,,,true,normalMonthIfNoLeap,false,示例,闰月,无闰月时按普通月,true"
  ].join("\n");
}

type BirthdayFormState = {
  name: string;
  calendarType: CalendarType;
  year: string;
  month: string;
  day: string;
  isLeapMonth: boolean;
  leapMonthPolicy: "onlyLeapMonth" | "normalMonthIfNoLeap";
  displayAge: boolean;
  group: string;
  tags: string;
  note: string;
  visible: boolean;
};

function formFromBirthday(birthday: BirthdayView): BirthdayFormState {
  return {
    name: birthday.name,
    calendarType: birthday.calendarType,
    year: birthday.year ? String(birthday.year) : "",
    month: String(birthday.month),
    day: String(birthday.day),
    isLeapMonth: birthday.isLeapMonth,
    leapMonthPolicy: birthday.leapMonthPolicy ?? "normalMonthIfNoLeap",
    displayAge: birthday.displayAge,
    group: birthday.group ?? "",
    tags: birthday.tags.join("|"),
    note: birthday.note ?? "",
    visible: birthday.visible
  };
}

function hasAdvancedFormValues(form: BirthdayFormState): boolean {
  return Boolean(
    form.year ||
      form.isLeapMonth ||
      form.group ||
      form.tags ||
      form.note ||
      form.displayAge ||
      !form.visible
  );
}

function hasDuplicateDistinguishingInfo(form: BirthdayFormState): boolean {
  return Boolean(form.group.trim() || form.note.trim() || form.tags.split(/[;|]/).some((tag) => tag.trim()));
}

function formToInput(form: BirthdayFormState): BirthdayInput {
  const isLunar = form.calendarType === "lunar";
  const isLeapMonth = isLunar && form.isLeapMonth;
  return {
    name: form.name,
    calendarType: form.calendarType,
    year: form.year.trim() ? Number(form.year) : undefined,
    month: Number(form.month),
    day: Number(form.day),
    isLeapMonth,
    leapMonthPolicy: isLeapMonth ? form.leapMonthPolicy : undefined,
    displayAge: form.displayAge,
    group: form.group,
    tags: form.tags
      .split(/[;|]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    note: form.note,
    visible: form.visible
  };
}
