import React, { useState, useMemo } from 'react';
import {
  Trophy,
  Users,
  Send,
  Sparkles,
  Heart,
  Shield,
  Coffee,
  Zap,
  TrendingUp,
  Share2,
  Copy,
  Check,
  Flame,
  Plus,
  Compass,
  Award,
  Radio,
  Clock,
  Coins,
  MessageCircle,
} from 'lucide-react';
import { UserProfile, FreedomStats, FriendPeer, NudgeOption, NudgeMessage, SharedMilestone } from '../types';
import { NUDGE_OPTIONS, INITIAL_FRIENDS, INITIAL_SHARED_MILESTONES, SQUAD_CIRCLES } from '../data/socialPeers';
import { triggerConfetti } from '../utils/confettiExplosion';
import { playMilestoneChime } from '../utils/audioFeedback';

interface SocialDashboardViewProps {
  profile: UserProfile;
  stats: FreedomStats;
  showToast: (msg: string) => void;
}

export const SocialDashboardView: React.FC<SocialDashboardViewProps> = ({
  profile,
  stats,
  showToast,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'leaderboard' | 'nudges' | 'activity' | 'squads'>('leaderboard');
  const [leaderboardSort, setLeaderboardSort] = useState<'streak' | 'money' | 'cravings' | 'cigarettes'>('streak');

  // Friends State
  const [friends, setFriends] = useState<FriendPeer[]>(() => {
    try {
      const saved = localStorage.getItem('smokefree_friends');
      return saved ? JSON.parse(saved) : INITIAL_FRIENDS;
    } catch {
      return INITIAL_FRIENDS;
    }
  });

  // Nudge Messages Inbox & Outbox
  const [nudges, setNudges] = useState<NudgeMessage[]>(() => {
    const defaultNudges: NudgeMessage[] = [
      {
        id: 'n-1',
        fromFriendId: 'friend-1',
        fromFriendName: 'Арман Сейткалиев',
        fromAvatar: '🧗‍♂️',
        toFriendId: 'current-user',
        type: 'shield',
        emoji: '🛡️',
        label: 'Щит воли',
        customText: 'Брат, держи щит! Вечерняя тяга скоро отпустит, ты сильнее.',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 'n-2',
        fromFriendId: 'friend-6',
        fromFriendName: 'Сабина Нурланова',
        fromAvatar: '✨',
        toFriendId: 'current-user',
        type: 'high_five',
        emoji: '✋',
        label: 'Дай пять!',
        customText: 'Поздравляю с новым рекордом чистых дней! Так держать!',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      },
    ];
    try {
      const saved = localStorage.getItem('smokefree_nudges');
      return saved ? JSON.parse(saved) : defaultNudges;
    } catch {
      return defaultNudges;
    }
  });

  // Shared Activity Milestones
  const [sharedMilestones, setSharedMilestones] = useState<SharedMilestone[]>(() => {
    try {
      const saved = localStorage.getItem('smokefree_shared_milestones');
      return saved ? JSON.parse(saved) : INITIAL_SHARED_MILESTONES;
    } catch {
      return INITIAL_SHARED_MILESTONES;
    }
  });

  // Modal states
  const [selectedFriendForNudge, setSelectedFriendForNudge] = useState<FriendPeer | null>(null);
  const [customNudgeText, setCustomNudgeText] = useState('');
  const [selectedNudgeOption, setSelectedNudgeOption] = useState<NudgeOption>(NUDGE_OPTIONS[0]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');

  // Combine currentUser with Friends for Leaderboard
  const currentUserPeer: FriendPeer = useMemo(() => {
    return {
      id: 'current-user',
      name: profile.name || 'Вы (Герой свободы)',
      avatar: '🌟',
      statusMessage: `Держу чистый трек: ${stats.fractionalDays.toFixed(1)} дн. Сэкономлено ${stats.moneySaved.toLocaleString()} ${profile.currencySymbol}`,
      daysClean: Number(stats.fractionalDays.toFixed(1)),
      moneySaved: Math.round(stats.moneySaved),
      cigarettesAvoided: stats.cigarettesAvoided,
      cravingsResisted: stats.cravingsResistedCount,
      currentRankBadge: stats.fractionalDays >= 30 ? 'Легенда Воли (Ранг IV)' : stats.fractionalDays >= 7 ? 'Огненный Барьер (Ранг II)' : 'Чистый Старт (Ранг I)',
      rankBadgeEmoji: stats.fractionalDays >= 30 ? '👑' : stats.fractionalDays >= 7 ? '🛡️' : '🌱',
      lastActive: 'Сейчас в сети',
      isCurrentUser: true,
      squadName: 'Almaty Clean Lungs',
      nudgesReceived: nudges.filter((n) => n.toFriendId === 'current-user').length,
    };
  }, [profile, stats, nudges]);

  const sortedLeaderboard = useMemo(() => {
    const list = [...friends, currentUserPeer];
    return list.sort((a, b) => {
      if (leaderboardSort === 'streak') return b.daysClean - a.daysClean;
      if (leaderboardSort === 'money') return b.moneySaved - a.moneySaved;
      if (leaderboardSort === 'cravings') return b.cravingsResisted - a.cravingsResisted;
      if (leaderboardSort === 'cigarettes') return b.cigarettesAvoided - a.cigarettesAvoided;
      return 0;
    });
  }, [friends, currentUserPeer, leaderboardSort]);

  const currentUserRank = useMemo(() => {
    const idx = sortedLeaderboard.findIndex((p) => p.isCurrentUser);
    return idx !== -1 ? idx + 1 : 1;
  }, [sortedLeaderboard]);

  const nextAheadPeer = useMemo(() => {
    if (currentUserRank > 1) {
      return sortedLeaderboard[currentUserRank - 2];
    }
    return null;
  }, [sortedLeaderboard, currentUserRank]);

  // Actions
  const handleSendNudge = (e?: React.MouseEvent) => {
    if (e) triggerConfetti(e.clientX, e.clientY);
    playMilestoneChime();

    if (!selectedFriendForNudge) return;

    const newNudge: NudgeMessage = {
      id: `nudge-${Date.now()}`,
      fromFriendId: 'current-user',
      fromFriendName: profile.name || 'Вы',
      fromAvatar: '🌟',
      toFriendId: selectedFriendForNudge.id,
      type: selectedNudgeOption.type,
      emoji: selectedNudgeOption.emoji,
      label: selectedNudgeOption.label,
      customText: customNudgeText.trim() || selectedNudgeOption.phrase,
      timestamp: new Date().toISOString(),
    };

    const updatedNudges = [newNudge, ...nudges];
    setNudges(updatedNudges);
    localStorage.setItem('smokefree_nudges', JSON.stringify(updatedNudges));

    // Increase friend's nudges received count
    const updatedFriends = friends.map((f) =>
      f.id === selectedFriendForNudge.id
        ? { ...f, nudgesReceived: (f.nudgesReceived || 0) + 1 }
        : f
    );
    setFriends(updatedFriends);
    localStorage.setItem('smokefree_friends', JSON.stringify(updatedFriends));

    showToast(`Поддержка «${selectedNudgeOption.emoji} ${selectedNudgeOption.label}» отправлена ${selectedFriendForNudge.name}!`);
    setSelectedFriendForNudge(null);
    setCustomNudgeText('');
  };

  const handleCheerMilestone = (milestoneId: string, e: React.MouseEvent) => {
    triggerConfetti(e.clientX, e.clientY);
    playMilestoneChime();

    const updated = sharedMilestones.map((m) => {
      if (m.id === milestoneId) {
        return {
          ...m,
          cheersCount: m.userCheered ? m.cheersCount - 1 : m.cheersCount + 1,
          userCheered: !m.userCheered,
        };
      }
      return m;
    });

    setSharedMilestones(updated);
    localStorage.setItem('smokefree_shared_milestones', JSON.stringify(updated));
    showToast('🎉 Салют поддержки отправлен другу!');
  };

  const handleShareMyMilestone = (e: React.MouseEvent) => {
    triggerConfetti(e.clientX, e.clientY);
    playMilestoneChime();

    const newShared: SharedMilestone = {
      id: `sm-${Date.now()}`,
      friendId: 'current-user',
      friendName: profile.name || 'Вы (Герой свободы)',
      avatar: '🌟',
      title: `Рубеж: ${stats.fractionalDays.toFixed(1)} дней свободы!`,
      category: 'streak',
      description: `Сбережено ${Math.round(stats.moneySaved).toLocaleString()} ${profile.currencySymbol}, не выкурено ${stats.cigarettesAvoided} сигарет и отражено ${stats.cravingsResistedCount} позывов тяги!`,
      badgeEmoji: stats.fractionalDays >= 30 ? '👑' : '🔥',
      timestamp: 'Только что',
      cheersCount: 1,
      userCheered: true,
    };

    const updated = [newShared, ...sharedMilestones];
    setSharedMilestones(updated);
    localStorage.setItem('smokefree_shared_milestones', JSON.stringify(updated));
    showToast('🚀 Ваш прогресс опубликован в общую ленту побед!');
    setActiveSubTab('activity');
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `https://smokefree.app/squad?ref=${profile.id || 'clean-lungs-2026'}`;
    navigator.clipboard?.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 3000);
    showToast('Ссылка-приглашение скопирована в буфер обмена!');
  };

  const handleAddFriendByCode = () => {
    if (!friendCodeInput.trim()) return;
    const newFriend: FriendPeer = {
      id: `friend-${Date.now()}`,
      name: friendCodeInput.trim(),
      avatar: '🤝',
      statusMessage: 'Вместе на пути к чистым легким!',
      daysClean: 1.0,
      moneySaved: Math.round(stats.dailyExpense),
      cigarettesAvoided: profile.unitsPerDay,
      cravingsResisted: 2,
      currentRankBadge: 'Новобранец Свободы',
      rankBadgeEmoji: '🌱',
      lastActive: 'Только что',
      squadName: 'Almaty Clean Lungs',
      nudgesReceived: 0,
    };

    const updated = [newFriend, ...friends];
    setFriends(updated);
    localStorage.setItem('smokefree_friends', JSON.stringify(updated));
    setFriendCodeInput('');
    setIsInviteModalOpen(false);
    showToast(`Друг «${newFriend.name}» успешно добавлен в ваш круг поддержки!`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Социальный круг и Командный трек</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2">
              <span>Круг взаимной поддержки</span>
              <span className="text-sm px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                {friends.length + 1} единомышленников
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Отказ от курения в группе единомышленников повышает вероятность стойкой ремиссии на <strong className="text-emerald-400">+68%</strong>. Отправляйте «Щиты воли» и празднуйте победы вместе.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleShareMyMilestone}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>Поделиться победой ({stats.fractionalDays.toFixed(1)} дн)</span>
            </button>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-200 border border-indigo-500/30 font-semibold text-xs transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Пригласить друга</span>
            </button>
          </div>
        </div>

        {/* Current User Rank Status Highlight Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-base border border-amber-500/30 font-mono">
              #{currentUserRank}
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Ваш ранг в круге</div>
              <div className="font-bold text-slate-200">
                {currentUserRank === 1 ? '🥇 Лидер круга' : currentUserRank === 2 ? '🥈 2 место' : `${currentUserRank} место из ${friends.length + 1}`}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-base border border-emerald-500/30">
              {currentUserPeer.rankBadgeEmoji}
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Текущий титул</div>
              <div className="font-bold text-slate-200 truncate max-w-[130px]">
                {currentUserPeer.currentRankBadge}
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-black text-base border border-rose-500/30">
              🛡️
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">Поддержки получено</div>
              <div className="font-bold text-rose-300 font-mono">
                {currentUserPeer.nudgesReceived} импульсов
              </div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black text-base border border-indigo-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-slate-400 text-[11px]">До следующего ранга</div>
              <div className="font-bold text-indigo-300">
                {nextAheadPeer ? `+${(nextAheadPeer.daysClean - currentUserPeer.daysClean).toFixed(1)} дн.` : 'Вы на вершине!'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveSubTab('leaderboard')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'leaderboard'
                ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Лидерборд друзей</span>
          </button>

          <button
            onClick={() => setActiveSubTab('nudges')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'nudges'
                ? 'bg-rose-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Импульсы поддержки</span>
            {nudges.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-rose-300 font-mono">
                {nudges.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('activity')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'activity'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Лента триумфов</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900 text-emerald-300 font-mono">
              {sharedMilestones.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('squads')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
              activeSubTab === 'squads'
                ? 'bg-indigo-950 text-indigo-200 border border-indigo-500/40 font-bold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Сквады и сообщества</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: LEADERBOARD OF FRIENDS */}
      {activeSubTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* Sorting Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-300 font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Рейтинг формируется в реальном времени по параметру:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setLeaderboardSort('streak')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  leaderboardSort === 'streak'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🔥 Чистые дни
              </button>
              <button
                onClick={() => setLeaderboardSort('money')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  leaderboardSort === 'money'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                💰 Сэкономлено ({profile.currencySymbol})
              </button>
              <button
                onClick={() => setLeaderboardSort('cravings')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  leaderboardSort === 'cravings'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🥊 Отражено тяги
              </button>
              <button
                onClick={() => setLeaderboardSort('cigarettes')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  leaderboardSort === 'cigarettes'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                🫁 Без дыма (шт)
              </button>
            </div>
          </div>

          {/* Leaderboard Table / Cards */}
          <div className="space-y-3">
            {sortedLeaderboard.map((peer, index) => {
              const rank = index + 1;
              const isTop1 = rank === 1;
              const isTop2 = rank === 2;
              const isTop3 = rank === 3;
              const isMe = peer.isCurrentUser;

              return (
                <div
                  key={peer.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 relative overflow-hidden ${
                    isMe
                      ? 'bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/60 border-indigo-500/50 shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500/30'
                      : isTop1
                      ? 'bg-gradient-to-r from-amber-950/30 via-slate-900 to-slate-950 border-amber-500/40 shadow-lg'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: Rank & Avatar & User Info */}
                    <div className="flex items-center gap-3.5">
                      {/* Rank Badge */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base shrink-0 font-mono shadow-inner ${
                          isTop1
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isTop2
                            ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                            : isTop3
                            ? 'bg-amber-700/20 text-amber-400 border border-amber-700/40'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${rank}`}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-2xl shrink-0 shadow-md">
                        {peer.avatar}
                      </div>

                      {/* Names & Badges */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                            <span>{peer.name}</span>
                            {isMe && (
                              <span className="px-2 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono uppercase">
                                Это вы
                              </span>
                            )}
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 font-mono flex items-center gap-1">
                            <span>{peer.rankBadgeEmoji}</span>
                            <span className="text-[11px]">{peer.currentRankBadge}</span>
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 italic line-clamp-1">
                          «{peer.statusMessage}»
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          {peer.squadName && (
                            <span className="text-indigo-400 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {peer.squadName}
                            </span>
                          )}
                          <span>• {peer.lastActive}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Metrics & Nudge Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                      <div className="grid grid-cols-3 gap-3 text-right">
                        <div>
                          <div className="text-[10px] text-slate-400">Чистые дни</div>
                          <div className="text-sm font-black text-amber-400 font-mono">
                            {peer.daysClean.toFixed(1)} дн
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400">Сбережения</div>
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            {peer.moneySaved.toLocaleString()} {profile.currencySymbol}
                          </div>
                        </div>

                        <div>
                          <div className="text-[10px] text-slate-400">Тяг отражено</div>
                          <div className="text-sm font-black text-rose-400 font-mono">
                            {peer.cravingsResisted} 🥊
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {!isMe ? (
                        <button
                          onClick={() => {
                            setSelectedFriendForNudge(peer);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Поддержать</span>
                        </button>
                      ) : (
                        <div className="px-3 py-1.5 rounded-xl bg-slate-950 text-indigo-300 border border-indigo-500/20 text-xs font-mono text-center">
                          Ваш профиль
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: NUDGES & ENCOURAGEMENT INBOX */}
      {activeSubTab === 'nudges' && (
        <div className="space-y-6">
          {/* Quick Support Nudge Action Bar */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400" />
                <span>Быстрый импульс поддержки другу</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Выберите друга из списка контактов и отправьте ободряющий жест с позитивным смыслом
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {friends.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFriendForNudge(f)}
                  className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-indigo-500/40 text-left transition-all space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{f.avatar}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-amber-400 border border-slate-800">
                      {f.daysClean.toFixed(1)} дн
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                    {f.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {f.squadName}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Received Nudges History */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-indigo-400" />
                <span>Лента импульсов и взаимной поддержки</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {nudges.length} сообщений
              </span>
            </div>

            <div className="space-y-3">
              {nudges.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Пока нет импульсов поддержки. Отправьте первый импульс другу!
                </div>
              ) : (
                nudges.map((n) => {
                  const isIncoming = n.toFriendId === 'current-user';
                  return (
                    <div
                      key={n.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isIncoming
                          ? 'bg-gradient-to-r from-rose-950/20 via-slate-950 to-slate-950 border-rose-500/30'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-2xl shrink-0">
                          {n.emoji}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-200">
                              {isIncoming ? n.fromFriendName : `Вы ➔ ${friends.find((f) => f.id === n.toFriendId)?.name || 'Другу'}`}
                            </span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] bg-slate-800 text-rose-300 font-mono">
                              {n.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {n.customText}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] text-slate-500 font-mono block">
                          {new Date(n.timestamp).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isIncoming && (
                          <button
                            onClick={() => {
                              const sender = friends.find((f) => f.id === n.fromFriendId);
                              if (sender) setSelectedFriendForNudge(sender);
                            }}
                            className="mt-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                          >
                            Ответить взаимностью ➔
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SHARED ACTIVITY FEED */}
      {activeSubTab === 'activity' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span>Общая лента побед и достижений сообщества</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Каждый триумф ваших друзей вдохновляет и укрепляет решимость не сдаваться
                </p>
              </div>

              <button
                onClick={handleShareMyMilestone}
                className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-medium text-xs transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Опубликовать свой рекорд</span>
              </button>
            </div>

            <div className="space-y-4">
              {sharedMilestones.map((m) => (
                <div
                  key={m.id}
                  className="p-5 rounded-3xl bg-slate-950/70 border border-slate-800/90 shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-xl shrink-0">
                        {m.avatar}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200">{m.friendName}</div>
                        <div className="text-[11px] text-slate-500">{m.timestamp}</div>
                      </div>
                    </div>

                    <span className="text-2xl p-1.5 rounded-xl bg-slate-900 border border-slate-800">
                      {m.badgeEmoji}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-1">
                    <h4 className="text-xs font-bold text-emerald-400">{m.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{m.description}</p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>{m.cheersCount} человек поддержали</span>
                    </div>

                    <button
                      onClick={(e) => handleCheerMilestone(m.id, e)}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        m.userCheered
                          ? 'bg-rose-500 text-slate-950 border-rose-500 font-bold shadow-md'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{m.userCheered ? 'Вы поддержали ✓' : 'Салют и респект 👏'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: SQUADS AND CIRCLES */}
      {activeSubTab === 'squads' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SQUAD_CIRCLES.map((squad) => (
              <div
                key={squad.id}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl p-2 rounded-2xl bg-slate-950 border border-slate-800">
                      {squad.avatar}
                    </span>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {squad.membersCount} участников
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100">{squad.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{squad.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Сберегли вместе:</span>
                    <span className="font-mono font-bold text-emerald-400">{squad.totalSaved}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Сигарет не выкурено:</span>
                    <span className="font-mono font-bold text-slate-200">+{squad.totalCigarettesAvoided} шт.</span>
                  </div>

                  <button
                    onClick={() => showToast(`Вы уже состоите в скваде «${squad.name}»!`)}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors"
                  >
                    Активный сквад ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NUDGE SENDING MODAL */}
      {selectedFriendForNudge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedFriendForNudge.avatar}</span>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Поддержать: {selectedFriendForNudge.name}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Чистый трек: {selectedFriendForNudge.daysClean.toFixed(1)} дн. • {selectedFriendForNudge.squadName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedFriendForNudge(null)}
                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Select Nudge Type Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Выберите символ и тип импульса:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {NUDGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => {
                      setSelectedNudgeOption(opt);
                      setCustomNudgeText(opt.phrase);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all space-y-1 ${
                      selectedNudgeOption.type === opt.type
                        ? 'bg-indigo-600/30 border-indigo-500 text-slate-100 ring-2 ring-indigo-500/40'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <div className="text-2xl">{opt.emoji}</div>
                    <div className="text-xs font-bold truncate">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Message Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">
                Текст ободрения (можно изменить):
              </label>
              <textarea
                value={customNudgeText}
                onChange={(e) => setCustomNudgeText(e.target.value)}
                rows={2}
                placeholder={selectedNudgeOption.phrase}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFriendForNudge(null)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 text-xs font-semibold"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleSendNudge}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-rose-500 hover:from-indigo-400 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Отправить {selectedNudgeOption.emoji}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVITE FRIEND MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">Пригласить друга в круг</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">
                Ваша персональная ссылка-приглашение:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://smokefree.app/squad?ref=${profile.id || 'clean-lungs-2026'}`}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-indigo-300 font-mono focus:outline-none"
                />
                <button
                  onClick={handleCopyInviteLink}
                  className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  {inviteCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{inviteCopied ? 'Скопировано' : 'Копировать'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-3">
              <label className="text-xs font-semibold text-slate-300">
                Или добавьте друга по имени / коду:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Имя друга (напр. Руслан Ахметов)"
                  value={friendCodeInput}
                  onChange={(e) => setFriendCodeInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleAddFriendByCode}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
