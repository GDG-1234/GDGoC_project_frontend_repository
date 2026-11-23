import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  parseCampusQuery,
  PortalTopic,
  resolveBuildingByQuery,
  resolvePlaceByQuery,
} from '../features/chat-assistant/parseCampusQuery';
import {
  ApiClientError,
  calculateRoute,
  fetchBuildingDetail,
  fetchBuildings,
  fetchMapInfo,
  fetchNearestPlace,
  formatDurationText,
  formatFloorLabel,
  formatStepActionLabel,
  getUseMockMode,
  searchPlaces,
  setUseMockMode,
} from '../shared/api/apiClient';
import {
  signInWithGoogle,
  signOutFirebase,
  subscribeAuthState,
} from '../shared/api/firebaseAuth';
import {
  createConversation,
  deleteConversation,
  fetchConversationDetail,
  fetchConversations,
  fetchMe,
  PortalApiError,
  sendConversationMessage,
} from '../shared/api/portalApi';
import { MOCK_MAP_INFO, MOCK_PLACES } from '../shared/data/mockApiV1Data';
import {
  BuildingDetailResponse,
  BuildingSummary,
  MapInfoResponse,
  PlaceSummary,
  RouteMode,
  RouteResponse,
} from '../shared/types/api';
import {
  ChatCard,
  ConversationSummary,
  MessageResponse,
  UserResponse,
} from '../shared/types/portal';
import { MapPickTarget } from '../shared/types/ui';
import { Icon } from '../shared/ui/Icon';
import { ArtifactRouteSearchBar } from '../widgets/artifact-search/ArtifactRouteSearchBar';
import { ArtifactStepsPanel } from '../widgets/artifact-steps/ArtifactStepsPanel';
import { BuildingDetailPanel } from '../widgets/building-detail/BuildingDetailPanel';
import {
  ChatArtifactPayload,
  ChatMessage,
  ChatPanel,
  PromptSuggestionItem,
} from '../widgets/chat-panel/ChatPanel';
import { Map2DViewer } from '../widgets/map-2d-viewer/Map2DViewer';
import {
  NavSectionKey,
  NavSidebar,
} from '../widgets/nav-sidebar/NavSidebar';
import {
  PortalArtifactPanel,
  PortalNoticeItem,
} from '../widgets/portal-artifact/PortalArtifactPanel';

const LIVE_SUGGESTIONS: PromptSuggestionItem[] = [
  { label: '혜화관에서 신공학관 3층까지 길 알려줘', icon: 'map' },
  { label: '오늘 학생식당 점심 메뉴 알려줘', icon: 'bookmark' },
  { label: '이번 주 주요 학사 일정 확인하기', icon: 'notice' },
];

const MOCK_SUGGESTIONS: PromptSuggestionItem[] = [
  { label: '팔정도에서 신공학관 4142호까지 길 알려줘', icon: 'map' },
  { label: '명진관 편의시설이랑 운영시간 알려줘', icon: 'bookmark' },
  { label: '이번 주 주요 학사 일정 확인하기', icon: 'notice' },
];

const PORTAL_NOTICE_ITEMS: PortalNoticeItem[] = [
  {
    category: '서비스',
    title: '캠퍼스 2D 실내 길안내 및 층 단면도 기능이 연동되었어요',
    meta: 'v1 길안내 · 혜화관 → 신공학관 3층 바로 보기',
    followUpPrompt: '혜화관에서 신공학관 3층까지 길 알려줘',
  },
  {
    category: '학식 (예정)',
    title: '오늘의 학생식당(상록원·남산학사) 메뉴 통합 준비 중',
    meta: '포털 확장 예정 · 상록원 가는 길 보기',
    followUpPrompt: '후문에서 상록원 가는 길 알려줘',
  },
  {
    category: '학사·도서 (예정)',
    title: '학사 공지 · 도서 검색 · 채용 일정 모아보기 준비 중',
    meta: '포털 확장 예정 · 중앙도서관 정보 보기',
    followUpPrompt: '중앙도서관 편의시설 알려줘',
  },
];

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function getCardsArtifactTitle(cards: ChatCard[]): string {
  const first = cards[0]?.toolName;
  if (first === 'cafeteria_get_menu') return '학식 메뉴 보기';
  if (first === 'notice_search') return '학교 공지 검색 결과 보기';
  if (first === 'notice_get_detail') return '학교 공지 상세 보기';
  return '답변 상세 카드 보기';
}

function buildCardsArtifact(
  cards: ChatCard[],
  messageId: number
): ChatArtifactPayload | undefined {
  if (!cards || cards.length === 0) return undefined;
  return {
    id: `cards-${messageId}`,
    kind: 'CARDS',
    title: getCardsArtifactTitle(cards),
    cards,
  };
}

function mapServerMessage(msg: MessageResponse): ChatMessage {
  return {
    id: `srv-${msg.id}`,
    role: msg.role,
    text: msg.content,
    artifact: buildCardsArtifact(msg.cards, msg.id),
  };
}

function buildPortalReply(topic: PortalTopic): {
  text: string;
  suggestions: string[];
} {
  switch (topic) {
    case 'CAFETERIA':
      return {
        text:
          '오늘의 학생식당 메뉴 조회 기능은 캠퍼스 포털 확장 단계에서 연동 준비 중이에요.\n' +
          '대신 상록원 위치나 가는 길은 지도 아티팩트에서 바로 안내해 드릴 수 있습니다.',
        suggestions: ['후문에서 상록원 가는 길 알려줘', '상록원 정보 알려줘'],
      };
    case 'LIBRARY':
      return {
        text:
          '도서 검색과 열람실 좌석 현황은 포털 확장 단계에서 연결될 예정이에요.\n' +
          '중앙도서관 위치와 운영시간·편의시설은 지금 바로 확인해 드릴 수 있습니다.',
        suggestions: ['정문에서 중앙도서관 가는 길', '중앙도서관 편의시설 알려줘'],
      };
    case 'NOTICE':
      return {
        text:
          '이번 주 학사 일정과 주요 공지 요약은 포털 통합 단계에서 연결될 예정이에요.\n' +
          '오른쪽 공지 아티팩트에서 예정 안내 항목을 확인하거나 관련 건물로 이동할 수 있습니다.',
        suggestions: [
          '혜화관에서 신공학관 3층까지 길 알려줘',
          '정문에서 중앙도서관 가는 길',
        ],
      };
    case 'HELP':
    default:
      return {
        text:
          '동국대 캠퍼스 길안내와 건물 정보를 대화로 물어보실 수 있어요.\n' +
          '예: "혜화관에서 신공학관 3층 가는 길", "정문 → 중앙도서관 편한 길", "과학관 편의시설"',
        suggestions: [
          '혜화관에서 신공학관 3층까지 길 알려줘',
          '동대입구 방향 입구에서 문화관 B1층 가는 길',
          '과학관 편의시설 알려줘',
        ],
      };
  }
}

function formatRouteReply(
  from: PlaceSummary,
  to: PlaceSummary,
  res: RouteResponse,
  mode: RouteMode,
  avoidRoad: boolean,
  usedDefaultOrigin: boolean
): string {
  const { summary, steps } = res;
  const optionLabel = [
    mode === 'EASIEST' ? '편한 길' : '빠른 길',
    avoidRoad ? '차도 피하기' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const lines: string[] = [];
  if (usedDefaultOrigin) {
    lines.push(`출발지가 지정되지 않아 '${from.name}' 출발 기준으로 안내할게요.`);
  }
  lines.push(
    `${from.name}에서 ${to.name}까지(${optionLabel}) ${formatDurationText(
      summary.totalSeconds
    )} 정도 걸려요.`
  );
  lines.push(
    `예상 열량은 ${summary.totalKcal} kcal, 실내 층변경은 ${summary.floorChanges}회입니다.`
  );
  if (summary.usesShortcut && summary.savedSeconds && summary.savedSeconds > 0) {
    lines.push(
      `★ 학교 지름길이 포함되어 일반 길보다 ${formatDurationText(
        summary.savedSeconds
      )} 더 빨라요.`
    );
  }
  const preview = steps.slice(1, 3).map((s) => `${s.index + 1}. ${s.text}`);
  if (preview.length > 0) {
    lines.push(preview.join('\n'));
  }
  return lines.join('\n\n');
}

function formatBuildingReply(detail: BuildingDetailResponse): string {
  const floors = detail.floors.map((f) => f.label).join(' · ') || '정보 없음';
  const facilities =
    detail.facilities.length > 0
      ? detail.facilities
          .map((fac) => `${fac.name}(${fac.floorDescription})`)
          .join(', ')
      : '등록된 편의시설 없음';

  return [
    `${detail.name} 정보를 오른쪽 지도 아티팩트에 표시해 두었어요.`,
    `• 운영 시간: ${detail.operatingHours || '-'}\n• 전화번호: ${
      detail.phone || '-'
    }\n• 보유 층: ${floors}\n• 편의시설: ${facilities}`,
  ].join('\n\n');
}

export const GuideWorkspacePage: React.FC = () => {
  const [useMock, setUseMock] = useState<boolean>(getUseMockMode());
  const [hasServerError, setHasServerError] = useState<boolean>(false);
  const [mapInfo, setMapInfo] = useState<MapInfoResponse>(MOCK_MAP_INFO);
  const [buildings, setBuildings] = useState<BuildingSummary[]>([]);
  const [selectedBuilding, setSelectedBuilding] =
    useState<BuildingDetailResponse | null>(null);

  // 경로 탐색 상태
  const [fromPlace, setFromPlace] = useState<PlaceSummary | null>(null);
  const [toPlace, setToPlace] = useState<PlaceSummary | null>(null);
  const [mode, setMode] = useState<RouteMode>('FASTEST');
  const [avoidRoad, setAvoidRoad] = useState<boolean>(false);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(0);
  const [mapPickTarget, setMapPickTarget] = useState<MapPickTarget>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 챗봇·아티팩트 레이아웃 상태
  const [activeSection, setActiveSection] = useState<NavSectionKey>('chat');
  const [artifact, setArtifact] = useState<'map' | 'notice' | null>(null);
  const [isStepsSheetOpen, setIsStepsSheetOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [artifactTitle, setArtifactTitle] = useState<string>('동국대 2D 캠퍼스 지도');
  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);
  const [artifactError, setArtifactError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [artifactHistory, setArtifactHistory] = useState<ChatArtifactPayload[]>(
    []
  );

  // 인증 · 서버 대화 · 답변 카드 상태
  const [currentUser, setCurrentUser] = useState<UserResponse | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    number | null
  >(null);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const [activeCards, setActiveCards] = useState<ChatCard[]>([]);
  const [activeCardsTitle, setActiveCardsTitle] = useState<string | undefined>(
    undefined
  );
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] =
    useState<boolean>(false);
  const [mapTab, setMapTab] = useState<'route' | 'shortcuts' | 'favorites'>(
    'route'
  );
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] =
    useState<boolean>(false);
  const [mapFeedbackToast, setMapFeedbackToast] = useState<string | null>(null);

  const requestIdRef = useRef(0);
  const swipeStartXRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const triggerMapFeedback = (kind: 'COMMUNITY' | 'SHORTCUT' | 'REPORT') => {
    const msg =
      kind === 'COMMUNITY'
        ? '캠퍼스 커뮤니티 기능은 추후 업데이트로 준비 중이에요.'
        : kind === 'SHORTCUT'
        ? '나만의 지름길 제보 기능은 추후 업데이트로 오픈될 예정이에요.'
        : '문의사항 · 길 오류 신고 기능은 추후 업데이트로 연결될 예정이에요.';
    setMapFeedbackToast(msg);
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setMapFeedbackToast(null);
    }, 3200);
  };

  const totalSteps = routeResult?.steps.length ?? 0;
  const safeStepIndex =
    activeStepIndex !== null && activeStepIndex >= 0 && activeStepIndex < totalSteps
      ? activeStepIndex
      : 0;
  const activeStep =
    routeResult && totalSteps > 0 ? routeResult.steps[safeStepIndex] : null;
  const activeIndoorSegment =
    routeResult && activeStep
      ? routeResult.segments.find(
          (seg) =>
            seg.index === activeStep.segmentIndex &&
            seg.indoor &&
            Boolean(seg.floorImageUrl)
        ) ?? null
      : null;

  const moveActiveStep = (nextIndex: number) => {
    if (totalSteps === 0) return;
    setActiveStepIndex(Math.max(0, Math.min(totalSteps - 1, nextIndex)));
  };

  const landmarks: PlaceSummary[] = useMock
    ? MOCK_PLACES.filter(
        (p) => p.category === 'LANDMARK' || p.category === 'ENTRANCE'
      )
    : [];

  const loadMapAndBuildings = useCallback(async () => {
    try {
      const [mInfo, bList] = await Promise.all([
        fetchMapInfo(),
        fetchBuildings(),
      ]);
      setMapInfo(mInfo);
      setBuildings(bList.items);
      setHasServerError(false);
      setArtifactError(null);
      return true;
    } catch (err) {
      setHasServerError(true);
      if (err instanceof ApiClientError) {
        setArtifactError(err.message);
      } else {
        setArtifactError('백엔드 서버와 연결할 수 없습니다.');
      }
      return false;
    }
  }, []);

  useEffect(() => {
    void loadMapAndBuildings();
  }, [useMock, loadMapAndBuildings]);

  const refreshConversations = useCallback(async () => {
    try {
      const res = await fetchConversations();
      setConversations(res.items);
    } catch {
      // ignore transient sidebar refresh failure
    }
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeAuthState((fbUser) => {
      if (!fbUser) {
        if (!active) return;
        setCurrentUser(null);
        setConversations([]);
        setActiveConversationId(null);
        setRemainingToday(null);
        setAuthLoading(false);
        return;
      }

      setAuthLoading(true);
      setAuthError(null);
      void (async () => {
        try {
          const me = await fetchMe();
          if (!active) return;
          setCurrentUser(me);
          setHasServerError(false);
          const convList = await fetchConversations();
          if (!active) return;
          setConversations(convList.items);
        } catch (err) {
          if (!active) return;
          if (err instanceof PortalApiError) {
            setAuthError(err.message);
            if (
              err.code === 'EMAIL_NOT_ALLOWED' ||
              err.code === 'UNAUTHORIZED'
            ) {
              void signOutFirebase();
            }
          } else {
            setAuthError('사용자 정보를 불러오지 못했어요. 다시 로그인해 주세요.');
          }
          setCurrentUser(null);
        } finally {
          if (active) setAuthLoading(false);
        }
      })();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setAuthLoading(false);
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return;
      }
      setAuthError('Google 로그인에 실패했어요. 팝업 차단을 해제하고 다시 시도해 주세요.');
    }
  };

  const handleSignOut = async () => {
    setIsLogoutConfirmOpen(false);
    setAuthError(null);
    await signOutFirebase();
    setMessages([]);
    setActiveConversationId(null);
    setActiveCards([]);
    setActiveCardsTitle(undefined);
    setRemainingToday(null);
    setArtifact(null);
    setActiveSection('chat');
  };

  useEffect(() => {
    if (!isLogoutConfirmOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLogoutConfirmOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLogoutConfirmOpen]);

  const handleSelectConversation = async (convId: number) => {
    setIsLoading(true);
    setActiveSection('chat');
    try {
      const detail = await fetchConversationDetail(convId);
      setActiveConversationId(detail.id);
      setMessages(detail.messages.map(mapServerMessage));
      setArtifactTitle(detail.title);
      setActiveCards([]);
      setActiveCardsTitle(undefined);
      setArtifact(null);
    } catch (err) {
      const msg =
        err instanceof PortalApiError
          ? err.message
          : '대화 내용을 불러오지 못했어요.';
      appendAssistantMessage(msg, { isError: true });
      if (err instanceof PortalApiError && err.code === 'CONVERSATION_NOT_FOUND') {
        void refreshConversations();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (convId: number) => {
    try {
      await deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(null);
        setMessages([]);
        setActiveCards([]);
        setActiveCardsTitle(undefined);
        if (artifact === 'notice') {
          setArtifact(null);
        }
      }
    } catch (err) {
      const msg =
        err instanceof PortalApiError
          ? err.message
          : '대화를 삭제하지 못했어요.';
      appendAssistantMessage(msg, { isError: true });
    }
  };

  const registerArtifact = (item: ChatArtifactPayload) => {
    setArtifactHistory((prev) => [
      item,
      ...prev
        .filter(
          (existing) =>
            existing.id !== item.id &&
            !(existing.kind === item.kind && existing.title === item.title)
        )
        .slice(0, 5),
    ]);
  };

  const appendAssistantMessage = (
    text: string,
    extra?: Partial<Omit<ChatMessage, 'id' | 'role' | 'text'>>
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: createId('msg-ai'),
        role: 'assistant',
        text,
        ...extra,
      },
    ]);
  };

  const applyRouteState = (
    from: PlaceSummary,
    to: PlaceSummary,
    res: RouteResponse,
    nextMode: RouteMode,
    nextAvoidRoad: boolean,
    artifactId: string
  ) => {
    setFromPlace(from);
    setToPlace(to);
    setMode(nextMode);
    setAvoidRoad(nextAvoidRoad);
    setRouteResult(res);
    setActiveStepIndex(0);
    setSelectedBuilding(null);
    setActiveSection('map');
    setArtifactTitle(`${from.name} → ${to.name}`);
    setIsStepsSheetOpen(false);
    setIsSidePanelCollapsed(false);
    setIsSearchOpen(false);
    setMapTab('route');
    setActiveArtifactId(artifactId);
    setArtifactError(null);
    setArtifact('map');
  };

  const handleFallbackToMock = () => {
    setUseMockMode(true);
    setUseMock(true);
    setHasServerError(false);
    setFromPlace(null);
    setToPlace(null);
    setRouteResult(null);
    setSelectedBuilding(null);
    setActiveArtifactId(null);
    setArtifactTitle('동국대 2D 캠퍼스 지도 (Mock)');
    setArtifactError(null);
    if (messages.length > 0) {
      appendAssistantMessage(
        '오프라인 Mock 데이터 모드로 전환했어요. 아래 추천 질문을 누르거나 지도에서 건물을 선택해 보세요.',
        {
          suggestions: MOCK_SUGGESTIONS.slice(0, 2).map((s) => s.label),
        }
      );
    }
  };

  const handleRetryLiveServer = () => {
    setUseMockMode(false);
    setUseMock(false);
    setFromPlace(null);
    setToPlace(null);
    setRouteResult(null);
    setSelectedBuilding(null);
    setActiveArtifactId(null);
    setArtifactTitle('동국대 2D 캠퍼스 지도');
    setArtifactError(null);
  };

  const runRouteAndAnnounce = async (
    from: PlaceSummary,
    to: PlaceSummary,
    nextMode: RouteMode,
    nextAvoidRoad: boolean,
    usedDefaultOrigin = false
  ) => {
    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    setArtifactError(null);
    try {
      const res = await calculateRoute({
        from: { placeId: from.id },
        to: { placeId: to.id },
        options: {
          mode: nextMode,
          avoidRoad: nextAvoidRoad,
          compare: true,
        },
      });
      if (reqId !== requestIdRef.current) return;

      const artifactId = createId('artifact');
      const payload: ChatArtifactPayload = {
        id: artifactId,
        kind: 'ROUTE',
        title: `${from.name} → ${to.name}`,
        fromPlace: from,
        toPlace: to,
        routeResult: res,
        mode: nextMode,
        avoidRoad: nextAvoidRoad,
      };
      registerArtifact(payload);
      applyRouteState(from, to, res, nextMode, nextAvoidRoad, artifactId);
      appendAssistantMessage(
        formatRouteReply(
          from,
          to,
          res,
          nextMode,
          nextAvoidRoad,
          usedDefaultOrigin
        ),
        { artifact: payload }
      );
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      const isConnErr =
        err instanceof ApiClientError && err.code === 'INTERNAL_ERROR';
      if (isConnErr) setHasServerError(true);
      const errMsg =
        err instanceof ApiClientError
          ? err.message
          : '경로를 계산하는 중 문제가 발생했어요.';
      setArtifactError(errMsg);
      appendAssistantMessage(errMsg, {
        isError: true,
        canFallbackToMock: isConnErr && !useMock,
        suggestions:
          !isConnErr && (nextAvoidRoad || nextMode === 'EASIEST')
            ? [`${from.name}에서 ${to.name} 빠른 길로 알려줘`]
            : undefined,
      });
    } finally {
      if (reqId === requestIdRef.current) setIsLoading(false);
    }
  };

  const handleSendMessage = async (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;

    // 로그인 사용자는 백엔드 인증·채팅 API(/conversations)로 전송
    if (currentUser) {
      if (text.length > 2000) {
        appendAssistantMessage('메시지는 2,000자 이하로 입력해 주세요.', {
          isError: true,
        });
        return;
      }

      const optimisticId = createId('msg-user');
      setMessages((prev) => [
        ...prev,
        { id: optimisticId, role: 'user', text },
      ]);
      setIsLoading(true);

      try {
        let convId = activeConversationId;
        if (convId === null) {
          const created = await createConversation();
          convId = created.id;
          setActiveConversationId(convId);
          setConversations((prev) => [created, ...prev]);
        }

        const res = await sendConversationMessage(convId, { content: text });
        const userMsg = mapServerMessage(res.userMessage);
        const assistantMsg = mapServerMessage(res.assistantMessage);

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== optimisticId),
          userMsg,
          assistantMsg,
        ]);
        setRemainingToday(res.remainingToday);

        if (assistantMsg.artifact && assistantMsg.artifact.cards) {
          setActiveCards(assistantMsg.artifact.cards);
          setActiveCardsTitle(assistantMsg.artifact.title);
          setActiveArtifactId(assistantMsg.artifact.id);
          setActiveSection('notice');
          setArtifact('notice');
        }

        void refreshConversations();
      } catch (err) {
        if (err instanceof PortalApiError) {
          if (err.code === 'CONVERSATION_NOT_FOUND') {
            setActiveConversationId(null);
            void refreshConversations();
          }
          appendAssistantMessage(err.message, { isError: true });
        } else {
          appendAssistantMessage(
            '메시지를 전송하는 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
            { isError: true }
          );
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setMessages((prev) => [
      ...prev,
      { id: createId('msg-user'), role: 'user', text },
    ]);

    const intent = parseCampusQuery(text, buildings);

    if (intent.kind === 'PORTAL_INFO') {
      const reply = buildPortalReply(intent.topic);
      if (intent.topic === 'NOTICE' || intent.topic === 'CAFETERIA' || intent.topic === 'LIBRARY') {
        const artifactId = createId('artifact');
        const noticePayload: ChatArtifactPayload = {
          id: artifactId,
          kind: 'NOTICE',
          title: '학사 공지 · 캠퍼스 안내 보기',
        };
        registerArtifact(noticePayload);
        setActiveSection('notice');
        setActiveArtifactId(artifactId);
        setArtifact('notice');
        appendAssistantMessage(reply.text, {
          artifact: noticePayload,
          suggestions: reply.suggestions,
        });
      } else {
        appendAssistantMessage(reply.text, { suggestions: reply.suggestions });
      }
      return;
    }

    if (intent.kind === 'ROUTE') {
      const nextMode = intent.mode ?? mode;
      const nextAvoidRoad = intent.avoidRoad ?? avoidRoad;
      const usedDefaultOrigin = !intent.fromQuery && !fromPlace;
      setIsLoading(true);
      try {
        const [resolvedFrom, resolvedTo] = await Promise.all([
          intent.fromQuery
            ? resolvePlaceByQuery(intent.fromQuery)
            : Promise.resolve(fromPlace ?? (await resolvePlaceByQuery('정문'))),
          resolvePlaceByQuery(intent.toQuery),
        ]);

        if (!resolvedFrom || !resolvedTo) {
          setIsLoading(false);
          const missing = !resolvedFrom
            ? intent.fromQuery || '출발지'
            : intent.toQuery;
          appendAssistantMessage(
            `'${missing}'에 해당하는 장소를 찾지 못했어요. 건물 이름이나 층을 확인해서 다시 물어봐 주세요.`,
            {
              isError: true,
              suggestions: (useMock ? MOCK_SUGGESTIONS : LIVE_SUGGESTIONS)
                .slice(0, 2)
                .map((s) => s.label),
            }
          );
          return;
        }

        await runRouteAndAnnounce(
          resolvedFrom,
          resolvedTo,
          nextMode,
          nextAvoidRoad,
          usedDefaultOrigin
        );
      } catch (err) {
        setIsLoading(false);
        const isConnErr =
          err instanceof ApiClientError && err.code === 'INTERNAL_ERROR';
        if (isConnErr) setHasServerError(true);
        const msg =
          err instanceof ApiClientError
            ? err.message
            : '서버와 통신하지 못했어요. 백엔드 서버 상태를 확인해 주세요.';
        setArtifactError(msg);
        appendAssistantMessage(msg, {
          isError: true,
          canFallbackToMock: !useMock,
        });
      }
      return;
    }

    setIsLoading(true);
    try {
      const matchedBuilding = resolveBuildingByQuery(intent.query, buildings);
      if (matchedBuilding) {
        const detail = await fetchBuildingDetail(matchedBuilding.id);
        const artifactId = createId('artifact');
        const payload: ChatArtifactPayload = {
          id: artifactId,
          kind: 'BUILDING',
          title: `${detail.name} 정보 보기`,
          buildingDetail: detail,
        };
        registerArtifact(payload);
        setSelectedBuilding(detail);
        setActiveSection('saved');
        setArtifactTitle(`${detail.name} 정보`);
        setIsStepsSheetOpen(false);
        setActiveArtifactId(artifactId);
        setArtifactError(null);
        setArtifact('map');
        appendAssistantMessage(formatBuildingReply(detail), {
          artifact: payload,
          suggestions: [`정문에서 ${detail.name} 가는 길 알려줘`],
        });
        return;
      }

      const place = await resolvePlaceByQuery(intent.query);
      if (place && place.buildingId !== null) {
        const detail = await fetchBuildingDetail(place.buildingId);
        const artifactId = createId('artifact');
        const payload: ChatArtifactPayload = {
          id: artifactId,
          kind: 'BUILDING',
          title: `${detail.name} 정보 보기`,
          buildingDetail: detail,
        };
        registerArtifact(payload);
        setSelectedBuilding(detail);
        setActiveSection('saved');
        setArtifactTitle(`${detail.name} 정보`);
        setIsStepsSheetOpen(false);
        setActiveArtifactId(artifactId);
        setArtifactError(null);
        setArtifact('map');
        appendAssistantMessage(formatBuildingReply(detail), {
          artifact: payload,
          suggestions: [`정문에서 ${place.name} 가는 길 알려줘`],
        });
        return;
      }

      if (place) {
        appendAssistantMessage(
          `'${place.name}'은(는) 교내 주요 지점(${formatFloorLabel(
            place.floor
          )})이에요. 어디로 이동할지 함께 말씀해 주세요!`,
          {
            suggestions: [
              `${place.name}에서 신공학관 3층 가는 길`,
              `정문에서 ${place.name} 가는 길`,
            ],
          }
        );
        return;
      }

      appendAssistantMessage(
        `'${text}'에 맞는 장소나 경로를 찾지 못했어요. 출발지·도착지나 건물 이름을 포함해 질문해 보세요.`,
        {
          suggestions: (useMock ? MOCK_SUGGESTIONS : LIVE_SUGGESTIONS).map(
            (s) => s.label
          ),
        }
      );
    } catch (err) {
      const isConnErr =
        err instanceof ApiClientError && err.code === 'INTERNAL_ERROR';
      if (isConnErr) setHasServerError(true);
      const msg =
        err instanceof ApiClientError
          ? err.message
          : '서버와 통신하는 중 오류가 발생했어요.';
      setArtifactError(msg);
      appendAssistantMessage(msg, {
        isError: true,
        canFallbackToMock: !useMock,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenArtifact = (payload: ChatArtifactPayload) => {
    setActiveArtifactId(payload.id);
    setArtifactError(null);

    if (payload.kind === 'CARDS' && payload.cards) {
      setActiveCards(payload.cards);
      setActiveCardsTitle(payload.title);
      setActiveSection('notice');
      setArtifact('notice');
      return;
    }

    if (payload.kind === 'NOTICE') {
      setActiveCards([]);
      setActiveCardsTitle(undefined);
      setActiveSection('notice');
      setArtifact('notice');
      return;
    }

    setIsStepsSheetOpen(false);
    if (
      payload.kind === 'ROUTE' &&
      payload.routeResult &&
      payload.fromPlace &&
      payload.toPlace
    ) {
      applyRouteState(
        payload.fromPlace,
        payload.toPlace,
        payload.routeResult,
        payload.mode ?? mode,
        payload.avoidRoad ?? avoidRoad,
        payload.id
      );
    } else if (payload.kind === 'BUILDING' && payload.buildingDetail) {
      setActiveSection('saved');
      setSelectedBuilding(payload.buildingDetail);
      setArtifactTitle(`${payload.buildingDetail.name} 정보`);
      setArtifact('map');
    }
  };

  const selectSection = (section: NavSectionKey) => {
    setActiveSection(section);

    if (section === 'chat') {
      setActiveConversationId(null);
      setMessages([]);
      setArtifact(null);
      setActiveCards([]);
      setActiveCardsTitle(undefined);
      setRouteResult(null);
      setFromPlace(null);
      setToPlace(null);
      setSelectedBuilding(null);
      setActiveArtifactId(null);
      setMapPickTarget(null);
      return;
    }

    if (section === 'cafeteria') {
      void handleSendMessage('오늘 학생식당 점심 메뉴 알려줘');
      return;
    }

    if (section === 'timetable') {
      setActiveCards([]);
      setActiveCardsTitle('내 시간표 · 다음 수업 길안내 (예정)');
      setArtifact('notice');
      return;
    }

    if (section === 'notice') {
      setActiveCards([]);
      setActiveCardsTitle(undefined);
      setArtifact('notice');
      return;
    }

    setIsStepsSheetOpen(false);
    if (section === 'shortcuts') {
      setMapTab('shortcuts');
      setArtifactTitle('캠퍼스 지름길 모음');
      setIsSearchOpen(false);
    } else if (section === 'saved') {
      setMapTab('route');
      if (!selectedBuilding) setArtifactTitle('건물 · 편의시설 지도');
      setIsSearchOpen(false);
    } else {
      setMapTab('route');
      if (!routeResult) {
        setArtifactTitle('동국대 2D 캠퍼스 지도');
      }
    }
    setArtifact('map');
  };

  const recalculateActiveRouteIfNeeded = async (
    nextMode: RouteMode,
    nextAvoidRoad: boolean
  ) => {
    setMode(nextMode);
    setAvoidRoad(nextAvoidRoad);
    if (!fromPlace || !toPlace) return;
    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    setArtifactError(null);
    try {
      const res = await calculateRoute({
        from: { placeId: fromPlace.id },
        to: { placeId: toPlace.id },
        options: { mode: nextMode, avoidRoad: nextAvoidRoad, compare: true },
      });
      if (reqId !== requestIdRef.current) return;
      setRouteResult(res);
      setActiveStepIndex(0);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      if (err instanceof ApiClientError) setArtifactError(err.message);
    } finally {
      if (reqId === requestIdRef.current) setIsLoading(false);
    }
  };

  const applyEndpointSelection = async (
    place: PlaceSummary,
    target: 'FROM' | 'TO'
  ) => {
    const nextFrom = target === 'FROM' ? place : fromPlace;
    const nextTo = target === 'TO' ? place : toPlace;
    if (target === 'FROM') setFromPlace(place);
    else setToPlace(place);

    if (nextFrom && nextTo) {
      await runRouteAndAnnounce(nextFrom, nextTo, mode, avoidRoad);
    } else {
      appendAssistantMessage(
        `'${place.name}'을(를) ${
          target === 'FROM' ? '출발지' : '도착지'
        }로 지정했어요. ${
          target === 'FROM' ? '도착지' : '출발지'
        }도 알려주시면 경로를 그려드릴게요!`
      );
    }
  };

  const handleSwapPlaces = async () => {
    const nextFrom = toPlace;
    const nextTo = fromPlace;
    setFromPlace(nextFrom);
    setToPlace(nextTo);
    if (nextFrom && nextTo) {
      await runRouteAndAnnounce(nextFrom, nextTo, mode, avoidRoad);
    }
  };

  const handleMapPixelClick = async (x: number, y: number) => {
    const target = mapPickTarget;
    if (!target) return;
    try {
      const nearest = await fetchNearestPlace({ x, y, floor: 0 });
      setMapPickTarget(null);
      await applyEndpointSelection(nearest.place, target);
    } catch (err) {
      if (err instanceof ApiClientError) setArtifactError(err.message);
    }
  };

  const handleSelectBuildingOnMap = async (buildingId: number) => {
    try {
      const detail = await fetchBuildingDetail(buildingId);
      setSelectedBuilding(detail);
      setIsSidePanelCollapsed(false);
      if (!routeResult) {
        setArtifactTitle(`${detail.name} 정보`);
      }
      setArtifactError(null);
    } catch (err) {
      if (err instanceof ApiClientError) setArtifactError(err.message);
    }
  };

  const handleSetBuildingAsEndpoint = async (
    buildingId: number,
    buildingName: string,
    target: 'FROM' | 'TO'
  ) => {
    setArtifactError(null);
    try {
      const res = await searchPlaces({ q: buildingName, limit: 20 });
      const place =
        res.items.find(
          (p) => p.buildingId === buildingId && p.name === buildingName
        ) ??
        res.items.find((p) => p.name === buildingName) ??
        res.items.find((p) => p.buildingId === buildingId && p.floor === 0) ??
        res.items.find((p) => p.buildingId === buildingId) ??
        res.items[0];
      if (!place) {
        setArtifactError('이 건물에 해당하는 장소를 찾을 수 없어요.');
        return;
      }

      await applyEndpointSelection(place, target);
    } catch (err) {
      if (err instanceof ApiClientError) setArtifactError(err.message);
    }
  };

  const closeArtifact = () => {
    setArtifact(null);
    setMapPickTarget(null);
    setIsSearchOpen(false);
    setActiveSection('chat');
  };

  const recentItems = artifactHistory.map((item) => ({
    id: item.id,
    label: item.title,
  }));

  return (
    <div className={artifact ? 'app-shell artifact-open' : 'app-shell'}>
      <div className={artifact ? 'desktop-sidebar collapsed' : 'desktop-sidebar'}>
        <NavSidebar
          active={activeSection}
          recentItems={recentItems}
          conversations={conversations}
          activeConversationId={activeConversationId}
          user={currentUser}
          authLoading={authLoading}
          useMock={useMock}
          hasServerError={hasServerError}
          onSelectSection={selectSection}
          onSelectRecent={(id) => {
            const found = artifactHistory.find((a) => a.id === id);
            if (found) handleOpenArtifact(found);
          }}
          onSelectConversation={(id) => void handleSelectConversation(id)}
          onDeleteConversation={(id) => void handleDeleteConversation(id)}
          onSignIn={() => void handleSignIn()}
          onSignOut={() => setIsLogoutConfirmOpen(true)}
          onRetryLiveServer={handleRetryLiveServer}
        />
      </div>

      <header className="mobile-header">
        <button
          type="button"
          className="icon-button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="메뉴 열기"
        >
          <Icon name="menu" />
        </button>
        <button
          type="button"
          className="brand"
          onClick={() => selectSection('chat')}
        >
          <span>아코봇</span>
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={() => selectSection('chat')}
          aria-label="새 대화"
        >
          <Icon name="plus" />
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <div
            className="drawer-backdrop"
            onClick={() => setMobileMenuOpen(false)}
          />
          <NavSidebar
            active={activeSection}
            recentItems={recentItems}
            conversations={conversations}
            activeConversationId={activeConversationId}
            user={currentUser}
            authLoading={authLoading}
            useMock={useMock}
            hasServerError={hasServerError}
            onSelectSection={selectSection}
            onSelectRecent={(id) => {
              const found = artifactHistory.find((a) => a.id === id);
              if (found) handleOpenArtifact(found);
            }}
            onSelectConversation={(id) => void handleSelectConversation(id)}
            onDeleteConversation={(id) => void handleDeleteConversation(id)}
            onSignIn={() => void handleSignIn()}
            onSignOut={() => {
              setMobileMenuOpen(false);
              setIsLogoutConfirmOpen(true);
            }}
            onRetryLiveServer={handleRetryLiveServer}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      <ChatPanel
        messages={messages}
        activeArtifactId={activeArtifactId}
        isArtifactOpen={artifact !== null}
        mobileChatTitle={artifactTitle}
        showRouteOptions={artifact === 'map'}
        isLoading={isLoading}
        useMock={useMock}
        isAuthenticated={currentUser !== null}
        authLoading={authLoading}
        authError={authError}
        remainingToday={remainingToday}
        mode={mode}
        avoidRoad={avoidRoad}
        suggestions={useMock ? MOCK_SUGGESTIONS : LIVE_SUGGESTIONS}
        onSendMessage={handleSendMessage}
        onOpenArtifact={handleOpenArtifact}
        onChangeMode={(m) => recalculateActiveRouteIfNeeded(m, avoidRoad)}
        onToggleAvoidRoad={() =>
          recalculateActiveRouteIfNeeded(mode, !avoidRoad)
        }
        onFallbackToMock={handleFallbackToMock}
        onSignIn={() => void handleSignIn()}
      />

      {artifact === 'map' && (
        <aside className="artifact artifact-map" aria-label="캠퍼스 지도 및 길안내 아티팩트">
          <header className="artifact-header">
            <div>
              <h2>{artifactTitle}</h2>
            </div>

            <div className="artifact-header-actions">
              <button
                type="button"
                className={
                  isSearchOpen
                    ? 'header-search-toggle active'
                    : 'header-search-toggle'
                }
                onClick={() => setIsSearchOpen((prev) => !prev)}
                aria-expanded={isSearchOpen}
                aria-label="출발·도착 검색"
                title="출발·도착 직접 검색"
              >
                <Icon name="search" size={15} />
                <span>검색</span>
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={closeArtifact}
                aria-label="지도 닫기"
              >
                <Icon name="close" />
              </button>
            </div>
          </header>

          <div className="artifact-map-tabs" role="tablist" aria-label="지도 기능 탭">
            <button
              type="button"
              role="tab"
              aria-selected={mapTab === 'route'}
              className={mapTab === 'route' ? 'map-tab-btn active' : 'map-tab-btn'}
              onClick={() => setMapTab('route')}
            >
              경로 찾기
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mapTab === 'shortcuts'}
              className={
                mapTab === 'shortcuts' ? 'map-tab-btn active' : 'map-tab-btn'
              }
              onClick={() => setMapTab('shortcuts')}
            >
              <Icon name="bolt" size={13} />
              <span>지름길</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mapTab === 'favorites'}
              className={
                mapTab === 'favorites' ? 'map-tab-btn active' : 'map-tab-btn'
              }
              onClick={() => setMapTab('favorites')}
            >
              <Icon name="bookmark" size={13} />
              <span>즐겨찾기</span>
            </button>
          </div>

          {mapFeedbackToast && (
            <div className="artifact-toast" role="status">
              {mapFeedbackToast}
            </div>
          )}

          {mapTab === 'shortcuts' && (
            <div className="artifact-subpanel">
              <div className="subpanel-banner">
                <strong>
                  <Icon name="bolt" size={15} /> 캠퍼스 지름길 모음 (준비 중)
                </strong>
                <p>
                  실내·엘리베이터 지름길 데이터가 추가되면 이곳에서 바로 탐색할 수
                  있어요. 지금은 추천 경로를 바로 실행해 보세요.
                </p>
              </div>
              <div className="subpanel-cards">
                {[
                  {
                    tag: '인기 실내 이동',
                    title: '혜화관 → 신공학관 3층',
                    meta: '실내 엘리베이터 연계 추천 경로',
                    prompt: '혜화관에서 신공학관 3층까지 길 알려줘',
                  },
                  {
                    tag: '역 방면 진입',
                    title: '동대입구 방향 입구 → 문화관 B1층',
                    meta: '지하 단면도 포함 캠퍼스 진입 경로',
                    prompt: '동대입구 방향 입구에서 문화관 B1층 가는 길',
                  },
                  {
                    tag: '학식 이동',
                    title: '정문 → 상록원',
                    meta: '학생식당 빠른 길 안내',
                    prompt: '정문에서 상록원 가는 길 알려줘',
                  },
                ].map((preset) => (
                  <button
                    key={preset.title}
                    type="button"
                    className="subpanel-preset-card"
                    onClick={() => {
                      setMapTab('route');
                      void handleSendMessage(preset.prompt);
                    }}
                  >
                    <span>
                      <b>{preset.tag}</b>
                      <strong>{preset.title}</strong>
                      <small>{preset.meta}</small>
                    </span>
                    <Icon name="arrow" size={16} />
                  </button>
                ))}
              </div>
              <div className="subpanel-footer">
                <button
                  type="button"
                  className="artifact-aux-chip"
                  onClick={() => triggerMapFeedback('SHORTCUT')}
                >
                  <Icon name="bolt" size={13} />
                  <span>나만의 지름길 자랑하기</span>
                </button>
              </div>
            </div>
          )}

          {mapTab === 'favorites' && (
            <div className="artifact-subpanel">
              <div className="subpanel-banner">
                <strong>
                  <Icon name="bookmark" size={15} /> 즐겨찾기 · 다음 수업 연동 (예정)
                </strong>
                <p>
                  자주 가는 장소 저장과 시간표 기반 다음 수업 길안내가 연결될
                  공간이에요. 주요 건물을 눌러 상세 정보를 먼저 볼 수 있습니다.
                </p>
              </div>
              <div className="subpanel-cards">
                {(buildings.length > 0
                  ? buildings.slice(0, 5)
                  : [
                      { id: 1, name: '신공학관' },
                      { id: 2, name: '중앙도서관' },
                      { id: 3, name: '혜화관' },
                    ]
                ).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="subpanel-preset-card"
                    onClick={() => {
                      setMapTab('route');
                      void handleSelectBuildingOnMap(b.id);
                    }}
                  >
                    <span>
                      <b>주요 건물</b>
                      <strong>{b.name}</strong>
                      <small>지도에서 위치 · 층별 안내 보기</small>
                    </span>
                    <Icon name="arrow" size={16} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {mapTab === 'route' && (
            <div className="artifact-map-stage">
              <div
                className={
                  isSearchOpen
                    ? 'artifact-search-slot is-open'
                    : 'artifact-search-slot'
                }
              >
                <ArtifactRouteSearchBar
                  fromPlace={fromPlace}
                  toPlace={toPlace}
                  isLoading={isLoading}
                  onSelectFrom={(place) =>
                    void applyEndpointSelection(place, 'FROM')
                  }
                  onSelectTo={(place) =>
                    void applyEndpointSelection(place, 'TO')
                  }
                  onSwapPlaces={() => void handleSwapPlaces()}
                  onFindRoute={() => {
                    if (fromPlace && toPlace) {
                      void runRouteAndAnnounce(
                        fromPlace,
                        toPlace,
                        mode,
                        avoidRoad
                      );
                    }
                  }}
                />
              </div>

              {(hasServerError || artifactError) && (
                <div className="artifact-error-banner" role="alert">
                  <div className="artifact-error-copy">
                    <strong>
                      {artifactError || '실서버(/api/v1)에 연결할 수 없습니다.'}
                    </strong>
                    {hasServerError && !useMock && (
                      <span>
                        서버 상태와 localhost:5173 접속을 확인하거나 Mock으로 미리 볼
                        수 있어요.
                      </span>
                    )}
                  </div>
                  <div className="artifact-error-actions">
                    <button
                      type="button"
                      className="retry-btn"
                      onClick={() => void loadMapAndBuildings()}
                    >
                      다시 연결
                    </button>
                    {!useMock && (
                      <button
                        type="button"
                        className="fallback-mock-btn"
                        onClick={handleFallbackToMock}
                      >
                        Mock 데이터로 보기
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div
                className={
                  isSidePanelCollapsed
                    ? 'artifact-map-workspace side-collapsed'
                    : 'artifact-map-workspace'
                }
              >
                <section className="artifact-map-card" aria-label="캠퍼스 지도">
                  <div className="artifact-pick-bar">
                    <span className="map-card-label">
                      <Icon name="map" size={14} />
                      <span>
                        {mapPickTarget
                          ? `지도를 클릭하면 ${
                              mapPickTarget === 'FROM' ? '출발지' : '도착지'
                            }가 지정됩니다.`
                          : routeResult
                          ? '경로가 표시된 캠퍼스 지도'
                          : '지도에서 건물을 누르거나 출발·도착을 찍어보세요.'}
                      </span>
                    </span>
                    <div className="artifact-pick-buttons">
                      <button
                        type="button"
                        className={
                          mapPickTarget === 'FROM' ? 'pick-pill active' : 'pick-pill'
                        }
                        onClick={() =>
                          setMapPickTarget(mapPickTarget === 'FROM' ? null : 'FROM')
                        }
                      >
                        출발 찍기
                      </button>
                      <button
                        type="button"
                        className={
                          mapPickTarget === 'TO' ? 'pick-pill active' : 'pick-pill'
                        }
                        onClick={() =>
                          setMapPickTarget(mapPickTarget === 'TO' ? null : 'TO')
                        }
                      >
                        도착 찍기
                      </button>
                      <button
                        type="button"
                        className={
                          isSidePanelCollapsed
                            ? 'pick-pill side-panel-toggle-btn active'
                            : 'pick-pill side-panel-toggle-btn'
                        }
                        onClick={() => setIsSidePanelCollapsed((prev) => !prev)}
                        aria-expanded={!isSidePanelCollapsed}
                        title={
                          isSidePanelCollapsed
                            ? '우측 경로 안내 패널 열기'
                            : '우측 경로 안내 패널 접기'
                        }
                      >
                        {isSidePanelCollapsed
                          ? selectedBuilding
                            ? '건물 정보 열기'
                            : '경로 안내 열기'
                          : '안내 접기'}
                      </button>
                    </div>
                  </div>

                  <div className="artifact-map-wrap">
                    <div className="mobile-map-pick-chips" aria-label="지도 직접 찍기">
                      <button
                        type="button"
                        className={
                          mapPickTarget === 'FROM' ? 'pick-pill active' : 'pick-pill'
                        }
                        onClick={() =>
                          setMapPickTarget(mapPickTarget === 'FROM' ? null : 'FROM')
                        }
                      >
                        출발 찍기
                      </button>
                      <button
                        type="button"
                        className={
                          mapPickTarget === 'TO' ? 'pick-pill active' : 'pick-pill'
                        }
                        onClick={() =>
                          setMapPickTarget(mapPickTarget === 'TO' ? null : 'TO')
                        }
                      >
                        도착 찍기
                      </button>
                    </div>

                    <Map2DViewer
                      mapInfo={mapInfo}
                      buildings={buildings}
                      landmarks={landmarks}
                      fromPlace={fromPlace}
                      toPlace={toPlace}
                      routeResult={routeResult}
                      activeStepIndex={activeStepIndex}
                      mapPickTarget={mapPickTarget}
                      selectedBuildingId={selectedBuilding?.id ?? null}
                      onMapPixelClick={handleMapPixelClick}
                      onSelectStep={(idx) => setActiveStepIndex(idx)}
                      onSelectBuilding={handleSelectBuildingOnMap}
                    />

                    {activeIndoorSegment && activeIndoorSegment.floorImageUrl && (
                      <div className="indoor-pip-card">
                        <span className="indoor-pip-badge">
                          {formatFloorLabel(activeIndoorSegment.floor)} 건물 내부 경로 약도
                        </span>
                        <img
                          src={activeIndoorSegment.floorImageUrl}
                          alt={`${formatFloorLabel(activeIndoorSegment.floor)} 실내 단면도`}
                        />
                      </div>
                    )}
                  </div>
                </section>

                <section className="artifact-side-column" aria-label="경로 단계 및 건물 정보">
                  <div className="side-column-topbar">
                    <span>{selectedBuilding ? '건물 상세' : '경로 안내'}</span>
                    <button
                      type="button"
                      className="side-column-collapse-btn"
                      onClick={() => setIsSidePanelCollapsed(true)}
                      aria-label="우측 경로 안내 패널 접기"
                      title="지도 넓게 보기 (패널 접기)"
                    >
                      접기
                    </button>
                  </div>
                  <div className="side-column-body">
                    {selectedBuilding ? (
                    <BuildingDetailPanel
                      building={selectedBuilding}
                      onClose={() => setSelectedBuilding(null)}
                      onSetAsFrom={(id, name) =>
                        handleSetBuildingAsEndpoint(id, name, 'FROM')
                      }
                      onSetAsTo={(id, name) =>
                        handleSetBuildingAsEndpoint(id, name, 'TO')
                      }
                    />
                  ) : routeResult && fromPlace && toPlace ? (
                    <ArtifactStepsPanel
                      variant="card"
                      routeResult={routeResult}
                      activeStepIndex={safeStepIndex}
                      onSelectStep={(idx) => setActiveStepIndex(idx)}
                    />
                  ) : (
                    <div className="steps-card-idle">
                      <div className="steps-card-hero">
                        <div className="steps-card-hero-title">
                          <Icon name="flag" size={16} />
                          <strong>경로 단계 안내</strong>
                        </div>
                        <span className="steps-card-hero-meta">
                          상단 검색 바에서 출발·도착지를 고르거나 아래 추천 경로를 눌러보세요.
                        </span>
                      </div>
                      <div className="steps-idle-presets">
                        {[
                          {
                            label: '혜화관 → 신공학관 3층',
                            prompt: '혜화관에서 신공학관 3층까지 길 알려줘',
                          },
                          {
                            label: '동대입구 → 문화관 B1층',
                            prompt: '동대입구 방향 입구에서 문화관 B1층 가는 길',
                          },
                          {
                            label: '정문 → 상록원',
                            prompt: '정문에서 상록원 가는 길 알려줘',
                          },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            className="steps-idle-preset-btn"
                            onClick={() => void handleSendMessage(preset.prompt)}
                          >
                            <span>{preset.label}</span>
                            <Icon name="arrow" size={14} />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>
                </section>
              </div>

              <div className="artifact-bottom-actions" aria-label="캠퍼스 보조 기능">
                <button
                  type="button"
                  className="mockup-pill-btn"
                  onClick={() => triggerMapFeedback('COMMUNITY')}
                >
                  <Icon name="chat" size={15} />
                  <span>커뮤니티 이용하기</span>
                </button>
                <button
                  type="button"
                  className="mockup-pill-btn"
                  onClick={() => triggerMapFeedback('SHORTCUT')}
                >
                  <Icon name="bolt" size={15} />
                  <span>나만의 지름길 자랑하기</span>
                </button>
                <button
                  type="button"
                  className="mockup-pill-btn mockup-pill-btn-soft"
                  onClick={() => triggerMapFeedback('REPORT')}
                >
                  <Icon name="flag" size={15} />
                  <span>문의사항 남기기</span>
                </button>
              </div>

              <div className="artifact-compact-bottom">
                {selectedBuilding ? (
                  <BuildingDetailPanel
                    building={selectedBuilding}
                    onClose={() => setSelectedBuilding(null)}
                    onSetAsFrom={(id, name) =>
                      handleSetBuildingAsEndpoint(id, name, 'FROM')
                    }
                    onSetAsTo={(id, name) =>
                      handleSetBuildingAsEndpoint(id, name, 'TO')
                    }
                  />
                ) : routeResult && fromPlace && toPlace ? (
                  isStepsSheetOpen ? (
                    <div className="route-steps-sheet">
                      <ArtifactStepsPanel
                        variant="sheet"
                        routeResult={routeResult}
                        activeStepIndex={safeStepIndex}
                        onSelectStep={(idx) => setActiveStepIndex(idx)}
                        onCloseSheet={() => setIsStepsSheetOpen(false)}
                        onFeedback={triggerMapFeedback}
                      />
                    </div>
                  ) : (
                    <div className="route-summary">
                      <div className="route-hero-bar">
                        <span className="route-hero-time">
                          <Icon name="clock" size={16} />
                          <strong>
                            소요 시간:{' '}
                            {formatDurationText(routeResult.summary.totalSeconds)}
                          </strong>
                        </span>
                        {routeResult.summary.usesShortcut &&
                          routeResult.summary.savedSeconds &&
                          routeResult.summary.savedSeconds > 0 && (
                            <span className="route-hero-saved">
                              일반 루트보다{' '}
                              {formatDurationText(
                                routeResult.summary.savedSeconds
                              )}{' '}
                              단축!
                            </span>
                          )}
                      </div>

                      <div
                        className="route-step-carousel"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'ArrowLeft')
                            moveActiveStep(safeStepIndex - 1);
                          if (e.key === 'ArrowRight')
                            moveActiveStep(safeStepIndex + 1);
                        }}
                        onPointerDown={(e) => {
                          swipeStartXRef.current = e.clientX;
                        }}
                        onPointerUp={(e) => {
                          if (swipeStartXRef.current === null) return;
                          const delta = e.clientX - swipeStartXRef.current;
                          swipeStartXRef.current = null;
                          if (Math.abs(delta) < 36) return;
                          moveActiveStep(
                            delta < 0 ? safeStepIndex + 1 : safeStepIndex - 1
                          );
                        }}
                        onPointerCancel={() => {
                          swipeStartXRef.current = null;
                        }}
                      >
                        <button
                          type="button"
                          className="carousel-arrow-btn carousel-arrow-btn-prev"
                          disabled={safeStepIndex <= 0}
                          onClick={() => moveActiveStep(safeStepIndex - 1)}
                          aria-label="이전 이동 단계"
                        >
                          <Icon name="arrow" size={19} strokeWidth={2.5} />
                        </button>

                        <div className="route-title route-step-card-body">
                          <span className="route-number">
                            {String(safeStepIndex + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <strong>
                              {activeStep
                                ? activeStep.text
                                : `${fromPlace.name}에서 ${toPlace.name}까지`}
                            </strong>
                            <p>
                              {activeStep
                                ? `${formatStepActionLabel(
                                    activeStep.action
                                  )} · ${formatFloorLabel(activeStep.floor)}${
                                    activeStep.seconds
                                      ? ` · ${formatDurationText(
                                          activeStep.seconds
                                        )}`
                                      : ''
                                  } · ${safeStepIndex + 1}/${totalSteps}`
                                : mode === 'EASIEST'
                                ? '칼로리가 적게 드는 편한 경로'
                                : '가장 빠른 추천 경로'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="carousel-arrow-btn"
                          disabled={safeStepIndex >= totalSteps - 1}
                          onClick={() => moveActiveStep(safeStepIndex + 1)}
                          aria-label="다음 이동 단계"
                        >
                          <Icon name="arrow" size={19} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="route-meta">
                        <span>
                          <Icon name="walk" size={17} />{' '}
                          {routeResult.summary.totalKcal} kcal
                        </span>
                        <span>
                          {routeResult.summary.floorChanges > 0
                            ? `실내 이동 ${routeResult.summary.floorChanges}회`
                            : '실외 이동'}
                        </span>
                        <span>
                          {routeResult.summary.usesRoad ? '차도 포함' : '차도 제외'}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => setIsStepsSheetOpen(true)}
                        aria-expanded="false"
                      >
                        단계별 안내 보기 ({totalSteps}단계) ▴
                      </button>
                    </div>
                  )
                ) : (
                  <div className="route-summary route-summary-idle">
                    <p>
                      지도 위 건물을 선택해 상세 정보를 확인하거나, 상단 검색 버튼으로
                      출발·도착지를 입력해 경로를 띄워보세요.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      )}

      {artifact === 'notice' && (
        <PortalArtifactPanel
          items={PORTAL_NOTICE_ITEMS}
          cards={activeCards}
          title={activeCardsTitle}
          onClose={closeArtifact}
          onSelectPrompt={(prompt) => void handleSendMessage(prompt)}
        />
      )}

      {isLogoutConfirmOpen && (
        <div
          className="confirm-modal-backdrop"
          role="presentation"
          onClick={() => setIsLogoutConfirmOpen(false)}
        >
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
            aria-describedby="logout-modal-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="logout-modal-title">로그아웃하시겠어요?</h3>
            <p id="logout-modal-desc">
              로그아웃하면 현재 대화 화면에서 나가며, 저장된 대화 기록을 보려면
              Google 계정으로 다시 로그인해야 합니다.
            </p>
            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-btn-cancel"
                onClick={() => setIsLogoutConfirmOpen(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="confirm-btn-danger"
                onClick={() => void handleSignOut()}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
