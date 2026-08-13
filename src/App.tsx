import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { CommunityLayout } from './layouts/CommunityLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminRouteGuard } from './components/admin/AdminRouteGuard';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { TrekDetails } from './pages/TrekDetails';
import { ExpeditionBooking } from './pages/ExpeditionBooking';
import { MyExpeditions } from './pages/MyExpeditions';
import { BookingDetails } from './pages/BookingDetails';
import { SavedTreks } from './pages/SavedTreks';
import { Community } from './pages/Community';
import { Notifications } from './pages/Notifications';
import { CommunityProfile } from './pages/CommunityProfile';
import { CommunitySearch } from './pages/CommunitySearch';
import { CommunityPeople } from './pages/CommunityPeople';
import { AiPlanner } from './pages/AiPlanner';
import { MyJourneys } from './pages/MyJourneys';
import { JourneyDetail } from './pages/JourneyDetail';
import { TrekPulse } from './pages/TrekPulse';
import { Passport } from './pages/Passport';
import { Chat } from './pages/Chat';
import { AuthCallback } from './pages/AuthCallback';
import { GroupChatView } from './pages/GroupChatView';
import { ExpeditionDashboard } from './pages/ExpeditionDashboard';
import { GroupEvents } from './pages/GroupEvents';
import { GroupChecklists } from './pages/GroupChecklists';
import { GroupExpenses } from './pages/GroupExpenses';
import { ExecutiveCommandCenter } from './pages/admin/ExecutiveCommandCenter';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminTreks } from './pages/admin/AdminTreks';
import { AdminExpeditions } from './pages/admin/AdminExpeditions';
import { AdminDepartures } from './pages/admin/AdminDepartures';
import { AdminBookings } from './pages/admin/AdminBookings';
import { AdminModeration } from './pages/admin/AdminModeration';
import { AdminSafety } from './pages/admin/AdminSafety';
import { AdminGroupTreks } from './pages/admin/AdminGroupTreks';
import { AdminChallenges } from './pages/admin/AdminChallenges';
import { AdminAnnouncements } from './pages/admin/AdminAnnouncements';
import { AdminAuditLog } from './pages/admin/AdminAuditLog';
import { AdminUserAnalytics } from './pages/admin/AdminUserAnalytics';
import { AdminTrekPulse } from './pages/admin/AdminTrekPulse';

function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;