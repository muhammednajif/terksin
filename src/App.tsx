import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { CommunityLayout } from './layouts/CommunityLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminRouteGuard } from './components/admin/AdminRouteGuard';

const Home = lazy(() => import('./pages/Home'));
const Explore = lazy(() => import('./pages/Explore'));
const TrekDetails = lazy(() => import('./pages/TrekDetails'));
const ExpeditionBooking = lazy(() => import('./pages/ExpeditionBooking'));
const MyExpeditions = lazy(() => import('./pages/MyExpeditions'));
const BookingDetails = lazy(() => import('./pages/BookingDetails'));
const SavedTreks = lazy(() => import('./pages/SavedTreks'));
const Community = lazy(() => import('./pages/Community'));
const Notifications = lazy(() => import('./pages/Notifications'));
const CommunityProfile = lazy(() => import('./pages/CommunityProfile'));
const CommunitySearch = lazy(() => import('./pages/CommunitySearch'));
const CommunityPeople = lazy(() => import('./pages/CommunityPeople'));
const AiPlanner = lazy(() => import('./pages/AiPlanner'));
const MyJourneys = lazy(() => import('./pages/MyJourneys'));
const JourneyDetail = lazy(() => import('./pages/JourneyDetail'));
const TrekPulse = lazy(() => import('./pages/TrekPulse'));
const Passport = lazy(() => import('./pages/Passport'));
const Chat = lazy(() => import('./pages/Chat'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const GroupChatView = lazy(() => import('./pages/GroupChatView'));
const ExpeditionDashboard = lazy(() => import('./pages/ExpeditionDashboard'));
const GroupEvents = lazy(() => import('./pages/GroupEvents'));
const GroupChecklists = lazy(() => import('./pages/GroupChecklists'));
const GroupExpenses = lazy(() => import('./pages/GroupExpenses'));
const ExecutiveCommandCenter = lazy(() => import('./pages/admin/ExecutiveCommandCenter'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminTreks = lazy(() => import('./pages/admin/AdminTreks'));
const AdminExpeditions = lazy(() => import('./pages/admin/AdminExpeditions'));
const AdminDepartures = lazy(() => import('./pages/admin/AdminDepartures'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminModeration = lazy(() => import('./pages/admin/AdminModeration'));
const AdminSafety = lazy(() => import('./pages/admin/AdminSafety'));
const AdminGroupTreks = lazy(() => import('./pages/admin/AdminGroupTreks'));
const AdminChallenges = lazy(() => import('./pages/admin/AdminChallenges'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminAuditLog = lazy(() => import('./pages/admin/AdminAuditLog'));
const AdminUserAnalytics = lazy(() => import('./pages/admin/AdminUserAnalytics'));
const AdminTrekPulse = lazy(() => import('./pages/admin/AdminTrekPulse'));

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