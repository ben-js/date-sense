import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import { User } from '../types';

interface CurrentUser {
  user_id: string;
  email: string;
  permissions: Record<string, Record<string, boolean>>;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const router = useRouter();

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // loadUsers 함수 수정
  const loadUsers = async (isRefresh = false, search = '', status = 'all', grade = 'all', score = 'all') => {
    try {
      if (isRefresh) setRefreshing(true);
      
      const token = localStorage.getItem('adminToken');
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      // 쿼리 파라미터 추가
      const params = new URLSearchParams();
      if (search) params.append('email', search);
      if (status !== 'all') params.append('status', status);
      if (grade !== 'all') params.append('grade', grade);
      if (score !== 'all') params.append('score', score);
      const response = await fetch(`/api/users?${params.toString()}`, { headers });

      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        if (isRefresh) showToast('데이터가 새로고침되었습니다.');
      } else {
        console.error('Failed to load users');
        if (isRefresh) showToast('데이터 새로고침에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      if (isRefresh) showToast('데이터 새로고침 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  // 최초 마운트 시 전체 유저 불러오기
  useEffect(() => { loadUsers(); }, []);

  const hasPermission = (permission: string, action: string = 'read') => {
    if (!currentUser || !currentUser.permissions) return false;
    return currentUser.permissions[permission]?.[action] || false;
  };

  const handleStatusChange = async (user_id: string, newStatus: string) => {
    if (!hasPermission('user_management', 'write')) {
      showToast('사용자 상태를 변경할 권한이 없습니다.', 'error');
      return;
    }

    if (!confirm(`사용자 상태를 '${newStatus}'로 변경하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/users/${user_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        showToast('사용자 상태가 변경되었습니다.');
        loadUsers(true);
      } else {
        showToast('상태 변경에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Status change error:', error);
      showToast('상태 변경 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleGradeChange = async (user_id: string, newGrade: string) => {
    if (!hasPermission('user_management', 'write')) {
      showToast('사용자 등급을 변경할 권한이 없습니다.', 'error');
      return;
    }

    if (!confirm(`사용자 등급을 '${newGrade}'로 변경하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/users/${user_id}/grade`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ grade: newGrade })
      });

      if (response.ok) {
        showToast('사용자 등급이 변경되었습니다.');
        loadUsers(true);
      } else {
        showToast('등급 변경에 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error('Grade change error:', error);
      showToast('등급 변경 중 오류가 발생했습니다.', 'error');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    const matchesGrade = gradeFilter === 'all' || user.grade === gradeFilter;
    
    return matchesSearch && matchesStatus && matchesGrade;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-yellow-600 bg-yellow-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      case 'black': return 'text-white bg-gray-800';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'general': return 'text-blue-600 bg-blue-100';
      case 'silver': return 'text-gray-600 bg-gray-100';
      case 'gold': return 'text-yellow-600 bg-yellow-100';
      case 'premium': return 'text-purple-600 bg-purple-100';
      case 'excellent': return 'text-purple-600 bg-purple-100';
      case 'vip': return 'text-orange-600 bg-orange-100';
      case 'vvip': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const columns = [
    // 이메일 컬럼
    { key: 'email', header: '이메일', width: 'w-48' },
    // 상태 컬럼
    {
      key: 'status',
      header: '상태',
      width: 'w-20',
      render: (value: string) => {
        const statusNames: Record<string, string> = {
          'active': '활성',
          'inactive': '비활성',
          'suspended': '정지',
          'black': '블랙'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
            {statusNames[value] || value}
          </span>
        );
      }
    },
    // 등급 컬럼 (뱃지형태)
    {
      key: 'grade',
      header: '등급',
      width: 'w-20',
      render: (value: string) => {
        const gradeNames: Record<string, string> = {
          general: '일반',
          silver: '실버',
          gold: '골드',
          premium: '프리미엄',
          excellent: '우수',
          vip: 'VIP',
          vvip: 'VVIP'
        };
        const gradeColors: Record<string, string> = {
          general: 'text-blue-600 bg-blue-100',
          silver: 'text-gray-600 bg-gray-100',
          gold: 'text-yellow-600 bg-yellow-100',
          premium: 'text-purple-600 bg-purple-100',
          excellent: 'text-purple-600 bg-purple-100',
          vip: 'text-orange-600 bg-orange-100',
          vvip: 'text-red-600 bg-red-100'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${gradeColors[value] || 'text-gray-600 bg-gray-100'}`}>
            {gradeNames[value] || value}
          </span>
        );
      }
    },
    // 점수입력 컬럼 (뱃지형태)
    {
      key: 'has_score',
      header: '점수입력',
      width: 'w-20',
      render: (value: boolean) => (
        value
          ? <span className="px-2 py-1 rounded-full text-xs font-medium text-blue-700 bg-blue-100">작성됨</span>
          : <span className="px-2 py-1 rounded-full text-xs font-medium text-gray-500 bg-gray-100">미작성</span>
      )
    },
    // 가입일 컬럼
    {
      key: 'created_at',
      header: '가입일',
      width: 'w-28',
      render: (value: string) => {
        if (!value) return '-';
        try {
          const date = new Date(value);
          return `${date.getFullYear()}.${(date.getMonth()+1).toString().padStart(2,'0')}.${date.getDate().toString().padStart(2,'0')}`;
        } catch (error) {
          return '-';
        }
      }
    },
    // 작업 컬럼
    {
      key: 'actions',
      header: '작업',
      width: 'w-20',
      render: (_: any, user: User) => (
        <Button
          size="sm"
          variant="primary"
          onClick={() => router.push(`/user-detail/${user.user_id}`)}
          className="w-full text-xs px-2 py-1"
        >
          변경
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-xl">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">사용자 관리</h1>
            <p className="text-gray-600">사용자 정보를 관리하고 상태를 변경할 수 있습니다.</p>
          </div>

          {/* 필터 및 검색 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex flex-row flex-nowrap items-end gap-3">
              <Input
                label="검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="이메일로 검색"
                className="w-24 flex-shrink-0"
              />
              <Select
                label="상태"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'active', label: '활성' },
                  { value: 'inactive', label: '비활성' },
                  { value: 'suspended', label: '정지' },
                  { value: 'black', label: '블랙' }
                ]}
                className="w-24 flex-shrink-0"
              />
              <Select
                label="등급"
                value={gradeFilter}
                onChange={setGradeFilter}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'general', label: '일반' },
                  { value: 'silver', label: '실버' },
                  { value: 'gold', label: '골드' },
                  { value: 'premium', label: '프리미엄' },
                  { value: 'excellent', label: '우수' },
                  { value: 'vip', label: 'VIP' },
                  { value: 'vvip', label: 'VVIP' }
                ]}
                className="w-24 flex-shrink-0"
              />
              <Select
                label="점수입력"
                value={scoreFilter}
                onChange={setScoreFilter}
                options={[
                  { value: 'all', label: '전체' },
                  { value: 'scored', label: '작성됨' },
                  { value: 'not_scored', label: '미작성' }
                ]}
                className="w-24 flex-shrink-0"
              />
              <Button
                size="sm"
                onClick={() => loadUsers(false, searchTerm, statusFilter, gradeFilter, scoreFilter)}
                disabled={refreshing}
                className="w-28 h-10 py-3 text-base flex-shrink-0 text-black border border-gray-300 bg-white rounded-lg px-3 font-bold hover:bg-gray-50 transition-colors"
              >
                {refreshing ? '검색 중...' : '검색'}
              </Button>
            </div>
          </div>

          {/* 상태 및 등급 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📋 상태 및 등급 안내</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-800 mb-2">👤 사용자 상태</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    <span className="font-medium">활성 (Active):</span> 전체 기능 사용 가능
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    <span className="font-medium">비활성 (Inactive):</span> 전체 기능 사용 가능 (경고 상태)
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    <span className="font-medium">정지 (Suspended):</span> 소개팅 신청 불가, 수락만 가능
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                    <span className="font-medium">블랙 (Black):</span> 모든 기능 제한
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-2">⭐ 사용자 등급</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                    <span className="font-medium">일반:</span> 기본 등급 사용자
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                    <span className="font-medium">실버 (Silver):</span> 실버 등급 사용자
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    <span className="font-medium">골드 (Gold):</span> 골드 등급 사용자
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                    <span className="font-medium">프리미엄 (Premium):</span> 프리미엄 등급 사용자
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                    <span className="font-medium">VIP:</span> VIP 등급 사용자
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                    <span className="font-medium">VVIP:</span> VVIP 등급 사용자
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 text-xs text-gray-600">
              💡 <strong>팁:</strong> 상태는 사용자의 활동 제한을, 등급은 사용자의 레벨을 나타냅니다. 
              후기 평점, 신고율, 후기 작성율 등에 따라 등급이 자동으로 업데이트됩니다.
            </div>
          </div>

          {/* 사용자 테이블 */}
          <Table
            title="사용자 목록"
            data={users}
            columns={columns}
            loading={loading}
            emptyMessage="사용자가 없습니다."
            maxHeight="max-h-[600px]"
          />
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </Layout>
  );
} 