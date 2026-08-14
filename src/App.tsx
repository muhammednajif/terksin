import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { CommunityLayout } from './layouts/CommunityLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminRouteGuard } from './components/admin/AdminRouteGuard';

const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const Explore = lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const NearbyTreks = lazy(() => import('./pages/NearbyTreks').then(m => ({ default: m.NearbyTreks })));
const TrekDetails = lazy(() => import('./pages/TrekDetails').then(m => ({ default: m.TrekDetails })));
const ExpeditionBooking = lazy(() => import('./pages/ExpeditionBooking').then(m => ({ default: m.ExpeditionBooking })));
const MyExpeditions = lazy(() => import('./pages/MyExpeditions').then(m => ({ default: m.MyExpeditions })));
const BookingDetails = lazy(() => import('./pages/BookingDetails').then(m => ({ default: m.BookingDetails })));
const SavedTreks = lazy(() => import('./pages/SavedTreks').then(m => ({ default: m.SavedTreks })));
const Community = lazy(() => import('./pages/Community').then(m => ({ default: m.Community })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const CommunityProfile = lazy(() => import('./pages/CommunityProfile').then(m => ({ default: m.CommunityProfile })));
const CommunitySearch = lazy(() => import('./pages/CommunitySearch').then(m => ({ default: m.CommunitySearch })));
const CommunityPeople = lazy(() => import('./pages/CommunityPeople').then(m => ({ default: m.CommunityPeople })));
const AiPlanner = lazy(() => import('./pages/AiPlanner').then(m => ({ default: m.AiPlanner })));
const MyJourneys = lazy(() => import('./pages/MyJourneys').then(m => ({ default: m.MyJourneys })));
const JourneyDetail = lazy(() => import('./pages/JourneyDetail').then(m => ({ default: m.JourneyDetail })));
const TrekPulse = lazy(() => import('./pages/TrekPulse').then(m => ({ default: m.TrekPulse })));
const Passport = lazy(() => import('./pages/Passport').then(m => ({ default: m.Passport })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then(m => ({ default: m.AuthCallback })));
const GroupChatView = lazy(() => import('./pages/GroupChatView').then(m => ({ default: m.GroupChatView })));
const ExpeditionDashboard = lazy(() => import('./pages/ExpeditionDashboard').then(m => ({ default: m.ExpeditionDashboard })));
const GroupEvents = lazy(() => import('./pages/GroupEvents').then(m => ({ default: m.GroupEvents })));
const GroupChecklists = lazy(() => import('./pages/GroupChecklists').then(m => ({ default: m.GroupChecklists })));
const GroupExpenses = lazy(() => import('./pages/GroupExpenses').then(m => ({ default: m.GroupExpenses })));
const ExecutiveCommandCenter = lazy(() => import('./pages/admin/ExecutiveCommandCenter').then(m => ({ default: m.ExecutiveCommandCenter })));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminTreks = lazy(() => import('./pages/admin/AdminTreks').then(m => ({ default: m.AdminTreks })));
const AdminExpeditions = lazy(() => import('./pages/admin/AdminExpeditions').then(m => ({ default: m.AdminExpeditions })));
const AdminDepartures = lazy(() => import('./pages/admin/AdminDepartures').then(m => ({ default: m.AdminDepartures })));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings').then(m => ({ default: m.AdminBookings })));
const AdminModeration = lazy(() => import('./pages/admin/AdminModeration').then(m => ({ default: m.AdminModeration })));
const AdminSafety = lazy(() => import('./pages/admin/AdminSafety').then(m => ({ default: m.AdminSafety })));
const AdminGroupTreks = lazy(() => import('./pages/admin/AdminGroupTreks').then(m => ({ default: m.AdminGroupTreks })));
const AdminChallenges = lazy(() => import('./pages/admin/AdminChallenges').then(m => ({ default: m.AdminChallenges })));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements').then(m => ({ default: m.AdminAnnouncements })));
const AdminAuditLog = lazy(() => import('./pages/admin/AdminAuditLog').then(m => ({ default: m.AdminAuditLog })));
const AdminUserAnalytics = lazy(() => import('./pages/admin/AdminUserAnalytics').then(m => ({ default: m.AdminUserAnalytics })));
const AdminTrekPulse = lazy(() => import('./pages/admin/AdminTrekPulse').then(m => ({ default: m.AdminTrekPulse })));

const Loader = () => (
  <div className="min-h-screen flex items-center justify-center bg-brand-dark">
    <div className="w-8 h-8 border-2 border-brand-emerald border-t-transparent rounded-full animate-spin" />
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="explore" element={<Explore />} />
            <Route path="explore/nearby" element={<NearbyTreks />} />
            <Route element={<CommunityLayout />}>
              <Route path="community" element={<Community />} />
              <Route path="community/post/:id" element={<Community />} />
              <Route path="community/search" element={<CommunitySearch />} />
              <Route path="community/people" element={<CommunityPeople />} />
              <Route path="community/profile" element={<CommunityProfile />} />
              <Route path="community/profile/:id" element={<CommunityProfile />} />
              <Route path="chat" element={<Chat />} />
              <Route path="notifications" element={<Notifications />} />
            </Route>
            <Route path="ai-planner" element={<AiPlanner />} />
            <Route path="explore/pulse" element={<TrekPulse />} />
            <Route path="passport" element={<Passport />} />
            <Route path="treks/:id" element={<TrekDetails />} />
            <Route path="treks/:id/book" element={<ExpeditionBooking />} />
            <Route path="my-expeditions" element={<MyExpeditions />} />
            <Route path="my-expeditions/:bookingId" element={<BookingDetails />} />
            <Route path="saved-treks" element={<SavedTreks />} />
            <Route path="journeys" element={<MyJourneys />} />
            <Route path="journeys/:id" element={<JourneyDetail />} />
            <Route path="groups/:groupId" element={<GroupChatView />} />
            <Route path="groups/:groupId/dashboard" element={<ExpeditionDashboard />} />
            <Route path="groups/:groupId/events" element={<GroupEvents />} />
            <Route path="groups/:groupId/checklists" element={<GroupChecklists />} />
            <Route path="groups/:groupId/expenses" element={<GroupExpenses />} />
          </Route>
          <Route path="/admin" element={<AdminRouteGuard><AdminLayout /></AdminRouteGuard>}>
            <Route index element={<ExecutiveCommandCenter />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="treks" element={<AdminTreks />} />
            <Route path="expeditions" element={<AdminExpeditions />} />
            <Route path="departures" element={<AdminDepartures />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="moderation" element={<AdminRouteGuard requireModerator><AdminModeration /></AdminRouteGuard>} />
            <Route path="safety" element={<AdminSafety />} />
            <Route path="trekpulse" element={<AdminTrekPulse />} />
            <Route path="group-treks" element={<AdminGroupTreks />} />
            <Route path="challenges" element={<AdminChallenges />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
            <Route path="analytics" element={<AdminUserAnalytics />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;