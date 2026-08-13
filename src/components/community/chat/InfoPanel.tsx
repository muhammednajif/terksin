import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconX, IconUsers, IconPhoto, IconVideo, IconFile, IconMap2, IconMapPin,
  IconFlag, IconCampfire, IconDroplet, IconAlertTriangle, IconParking,
  IconMountain, IconToolsKitchen2, IconHeartbeat, IconEye, IconRipple,
  IconDownload, IconNavigation, IconBellOff, IconPin, IconArchive,
  IconTrash, IconBan, IconAlertOctagon, IconLink, IconCloud,
  IconSun, IconCloudRain, IconSnowflake, IconCloudFog, IconGridDots,
  IconChevronRight, IconMaximize, IconPaperclip, IconFiles,
  IconSpeakerphone, IconMessages, IconPhotoPlus,
} from '@tabler/icons-react';
import { getConversationMedia, getConversationRoutes, getConversationWaypoints, getConversationAlbums, createInviteLink } from '@/lib/chat';
import type { ChatConversation, ChatAttachment, ChatWaypoint, ChatExpeditionAlbum, ChatAlbumMedia } from '@/lib/database.types';

interface InfoPanelProps {
  conversation: ChatConversation | null;
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onlineUserIds?: Set<string>;
  onToggleMute?: () => void;
  onTogglePin?: () => void;
  onToggleArchive?: () => void;
  onClearChat?: () => void;
  onBlockUser?: () => void;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatCoord(value: number): string {
  return value.toFixed(5);
}

const WAYPOINT_ICONS: Record<string, React.ComponentType<any>> = {
  camp: IconCampfire, water_source: IconDroplet, danger: IconAlertTriangle,
  parking: IconParking, peak: IconMountain, food: IconToolsKitchen2,
  emergency_point: IconHeartbeat, viewpoint: IconEye, summit: IconFlag,
  lake: IconRipple, forest: IconMountain, bridge: IconFlag,
  shelter: IconCampfire, cave: IconMountain, pass: IconFlag,
  river_crossing: IconDroplet,
};

function getFileIcon(fileName: string, fileType: string) {
  if (fileType.startsWith('application/pdf')) return IconFile;
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) return IconFiles;
  if (fileType.includes('spreadsheet') || fileName.endsWith('.csv') || fileName.endsWith('.xlsx')) return IconGridDots;
  return IconPaperclip;
}

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes('clear') || c.includes('sun')) return IconSun;
  if (c.includes('rain') || c.includes('drizzle') || c.includes('thunder')) return IconCloudRain;
  if (c.includes('snow') || c.includes('sleet')) return IconSnowflake;
  if (c.includes('fog') || c.includes('mist') || c.includes('haze')) return IconCloudFog;
  return IconCloud;
}

function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  return text?.match(urlRegex) || [];
}

export function InfoPanel({
  conversation, isOpen, onClose, userId, onlineUserIds,
  onToggleMute, onTogglePin, onToggleArchive, onClearChat, onBlockUser,
}: InfoPanelProps) {
  const [photos, setPhotos] = useState<ChatAttachment[]>([]);
  const [videos, setVideos] = useState<ChatAttachment[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [documents, setDocuments] = useState<ChatAttachment[]>([]);
  const [waypoints, setWaypoints] = useState<ChatWaypoint[]>([]);
  const [albums, setAlbums] = useState<(ChatExpeditionAlbum & { media: ChatAlbumMedia[] })[]>([]);
  const [weatherCards, setWeatherCards] = useState<any[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const convId = conversation?.id;

  useEffect(() => {
    if (!convId || !isOpen) return;

    getConversationMedia(convId, 'image').then(setPhotos).catch(() => {});
    getConversationMedia(convId, 'video').then(setVideos).catch(() => {});
    getConversationRoutes(convId).then(setRoutes).catch(() => {});
    getConversationMedia(convId, 'document').then(setDocuments).catch(() => {});
    getConversationWaypoints(convId).then(setWaypoints).catch(() => {});
    getConversationAlbums(convId).then(setAlbums).catch(() => {});
  }, [convId, isOpen]);

  const participants = conversation?.participants || [];
  const otherParticipants = participants.filter(p => p.user_id !== userId);

  const showPhotos = photos.slice(0, 9);
  const maxPhotos = 9;

  const handleCreateInvite = async () => {
    if (!convId) return;
    setInviteLoading(true);
    try {
      const link = await createInviteLink(convId, userId);
      if (link) {
        const origin = window.location.origin;
        setInviteLink(`${origin}/invite/${link.code}`);
      }
    } finally {
      setInviteLoading(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
    }
  };

  if (!conversation) return null;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="hidden lg:block h-full bg-white/95 border-l border-black/5 overflow-hidden"
          >
            <div className="w-[320px] h-full flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-black/5">
                <h3 className="font-bold text-sm">Conversation Details</h3>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/5">
                  <IconX className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="p-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-emerald to-emerald-300 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-brand-emerald/20">
                    <IconUsers className="w-10 h-10 text-white" />
                  </div>
                  <h4 className="font-bold">{conversation.title || 'Direct Message'}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{participants.length} participants</p>
                </div>

                {/* Members */}
                <div className="px-4 mb-4">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <IconUsers className="w-3 h-3" /> Members
                  </h5>
                  <div className="space-y-2">
                    {otherParticipants.slice(0, 10).map((p: any) => (
                      <div key={p.user_id} className="flex items-center gap-2.5">
                        <div className="relative flex-shrink-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden">
                            {p.profile?.avatar_url ? (
                              <img src={p.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                                {(p.profile?.display_name || '?').charAt(0)}
                              </div>
                            )}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${onlineUserIds?.has(p.user_id) ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{p.profile?.display_name || p.profile?.username || 'User'}</p>
                            {p.role && p.role !== 'member' && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                p.role === 'leader' ? 'bg-amber-100 text-amber-700' :
                                p.role === 'co_leader' ? 'bg-blue-100 text-blue-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {p.role === 'leader' ? 'Leader' : p.role === 'co_leader' ? 'Co-leader' : 'Mod'}
                              </span>
                            )}
                          </div>
                          <p className={`text-[10px] font-medium ${onlineUserIds?.has(p.user_id) ? 'text-emerald-600' : 'text-gray-400'}`}>
                            {p.nickname && <span className="text-gray-500 mr-1">({p.nickname})</span>}
                            {onlineUserIds?.has(p.user_id) ? 'Online' : 'Offline'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {otherParticipants.length > 10 && (
                      <p className="text-xs text-gray-400 text-center pt-1">+{otherParticipants.length - 10} more</p>
                    )}
                  </div>
                </div>

                {/* Shared Photos */}
                {showPhotos.length > 0 && (
                  <div className="px-4 mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IconPhoto className="w-3 h-3" /> Shared Photos
                    </h5>
                    <div className="grid grid-cols-3 gap-1.5">
                      {showPhotos.map((att) => (
                        <button
                          key={att.id}
                          onClick={() => setFullscreenImage(att.file_url)}
                          className="aspect-square rounded-lg overflow-hidden bg-black/5 hover:ring-2 hover:ring-brand-emerald/50 transition-all"
                        >
                          <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                    {photos.length > maxPhotos && (
                      <button className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-brand-emerald hover:bg-brand-emerald/5 rounded-lg transition-colors">
                        View all ({photos.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Shared Videos */}
                {videos.length > 0 && (
                  <div className="px-4 mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IconVideo className="w-3 h-3" /> Shared Videos
                    </h5>
                    <div className="grid grid-cols-3 gap-1.5">
                      {videos.slice(0, 6).map((att) => (
                        <a
                          key={att.id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden bg-black/10 flex items-center justify-center relative group hover:ring-2 hover:ring-brand-emerald/50 transition-all"
                        >
                          {att.thumbnail_url ? (
                            <img src={att.thumbnail_url} alt={att.file_name} className="w-full h-full object-cover" />
                          ) : (
                            <IconVideo className="w-6 h-6 text-gray-400" />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                            <IconEye className="w-6 h-6 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                    {videos.length > 6 && (
                      <button className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-brand-emerald hover:bg-brand-emerald/5 rounded-lg transition-colors">
                        View all ({videos.length})
                      </button>
                    )}
                  </div>
                )}

                {/* Shared Routes */}
                {routes.length > 0 && (
                  <div className="px-4 mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IconMap2 className="w-3 h-3" /> Shared Routes
                    </h5>
                    <div className="space-y-2">
                      {routes.slice(0, 5).map((route, i) => (
                        <div key={route.id || i} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-emerald/20 to-emerald-200 flex items-center justify-center flex-shrink-0">
                            <IconMap2 className="w-4 h-4 text-brand-emerald" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{route.name || route.title || 'Route'}</p>
                            <p className="text-[10px] text-gray-400">{route.created_at ? formatDate(route.created_at) : ''}</p>
                          </div>
                          <a
                            href={route.file_url || route.url || '#'}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-full hover:bg-brand-emerald/10 text-brand-emerald"
                          >
                            <IconDownload className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared Files */}
                {documents.length > 0 && (
                  <div className="px-4 mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IconFile className="w-3 h-3" /> Shared Files
                    </h5>
                    <div className="space-y-1.5">
                      {documents.slice(0, 8).map((doc) => {
                        const FileIcon = getFileIcon(doc.file_name, doc.file_type);
                        return (
                          <a
                            key={doc.id}
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 transition-colors group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-black/5 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-emerald/10 transition-colors">
                              <FileIcon className="w-4 h-4 text-gray-500 group-hover:text-brand-emerald transition-colors" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{doc.file_name}</p>
                              <p className="text-[10px] text-gray-400">{formatFileSize(doc.file_size)}</p>
                            </div>
                            <IconDownload className="w-3.5 h-3.5 text-gray-400 group-hover:text-brand-emerald transition-colors" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shared Waypoints */}
                {waypoints.length > 0 && (
                  <div className="px-4 mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IconMapPin className="w-3 h-3" /> Shared Waypoints
                    </h5>
                    <div className="space-y-1.5">
                      {waypoints.slice(0, 6).map((wp) => {
                        const WpIcon = WAYPOINT_ICONS[wp.waypoint_type] || IconMapPin;
                        return (
                          <div key={wp.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-emerald/20 to-emerald-200 flex items-center justify-center flex-shrink-0">
                              <WpIcon className="w-4 h-4 text-brand-emerald" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{wp.title || wp.waypoint_type.replace(/_/g, ' ')}</p>
                              <p className="text-[10px] text-gray-400">
                                {formatCoord(wp.latitude)}, {formatCoord(wp.longitude)}
                              </p>
                            </div>
                            <a
                              href={`https://www.google.com/maps?q=${wp.latitude},${wp.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full hover:bg-brand-emerald/10 text-brand-emerald"
                            >
                              <IconNavigation className="w-4 h-4" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shared Expeditions */}
                {albums.length > 0 && (
                  <div className="px-4 mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IconPhotoPlus className="w-3 h-3" /> Shared Expeditions
                    </h5>
                    <div className="space-y-2">
                      {albums.slice(0, 4).map((album) => (
                        <div key={album.id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 transition-colors cursor-pointer">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                            {album.cover_url ? (
                              <img src={album.cover_url} alt={album.title || ''} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-brand-emerald/30 to-emerald-200 flex items-center justify-center">
                                <IconPhoto className="w-5 h-5 text-brand-emerald" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{album.title || 'Untitled Album'}</p>
                            <p className="text-[10px] text-gray-400">{album.photo_count} photos</p>
                          </div>
                          <IconChevronRight className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shared Weather Cards */}
                {weatherCards.length > 0 && (
                  <div className="px-4 mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IconCloud className="w-3 h-3" /> Weather Cards
                    </h5>
                    <div className="space-y-2">
                      {weatherCards.slice(0, 3).map((msg, i) => {
                        const meta = msg.metadata as any;
                        const condition = meta?.condition || 'Clear';
                        const WeatherIcon = getWeatherIcon(condition);
                        return (
                          <div key={msg.id || i} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center flex-shrink-0">
                              <WeatherIcon className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">{condition}</p>
                              <p className="text-[10px] text-gray-400">{meta?.temp ? `${Math.round(meta.temp)}°C` : msg.created_at ? formatDate(msg.created_at) : ''}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Shared Links */}
                {links.length > 0 && (
                  <div className="px-4 mb-4">
                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <IconLink className="w-3 h-3" /> Shared Links
                    </h5>
                    <div className="space-y-1.5">
                      {links.slice(0, 5).map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-xl hover:bg-black/5 transition-colors group"
                        >
                          <div className="w-7 h-7 rounded-lg bg-black/5 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-emerald/10 transition-colors">
                            <IconLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-brand-emerald transition-colors" />
                          </div>
                          <span className="text-xs text-brand-emerald truncate">{url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conversation Settings */}
                <div className="px-4 mb-4">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <IconMessages className="w-3 h-3" /> Settings
                  </h5>
                  <div className="space-y-0.5">
                    {onToggleMute && (
                      <button onClick={onToggleMute} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 transition-colors text-left">
                        <IconBellOff className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium">Mute</span>
                      </button>
                    )}
                    {onTogglePin && (
                      <button onClick={onTogglePin} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 transition-colors text-left">
                        <IconPin className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium">Pin</span>
                      </button>
                    )}
                    {onToggleArchive && (
                      <button onClick={onToggleArchive} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-black/5 transition-colors text-left">
                        <IconArchive className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-medium">Archive</span>
                      </button>
                    )}
                    {onClearChat && (
                      <button onClick={onClearChat} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-left">
                        <IconTrash className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-medium text-red-500">Clear chat</span>
                      </button>
                    )}
                    {onBlockUser && (
                      <button onClick={onBlockUser} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-left">
                        <IconBan className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-medium text-red-500">Block</span>
                      </button>
                    )}
                    <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 transition-colors text-left">
                      <IconAlertOctagon className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-medium text-red-500">Report</span>
                    </button>
                  </div>
                </div>

                {/* Create Invite Link */}
                <div className="px-4 mb-6">
                  <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <IconLink className="w-3 h-3" /> Invite
                  </h5>
                  {inviteLink ? (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-brand-emerald/5 border border-brand-emerald/20">
                      <span className="flex-1 text-xs truncate text-brand-emerald font-medium">{inviteLink}</span>
                      <button onClick={copyInviteLink} className="text-xs font-semibold text-brand-emerald hover:text-emerald-600 px-2 py-1 rounded-lg hover:bg-brand-emerald/10 transition-colors">
                        Copy
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateInvite}
                      disabled={inviteLoading}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-emerald to-emerald-500 text-white text-xs font-semibold hover:shadow-lg hover:shadow-brand-emerald/30 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <IconLink className="w-4 h-4" />
                      {inviteLoading ? 'Creating...' : 'Create Invite Link'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Gallery */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setFullscreenImage(null)}
          >
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
            >
              <IconX className="w-6 h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={fullscreenImage}
              alt=""
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
