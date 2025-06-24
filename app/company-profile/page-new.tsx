"use client";

import Image from "next/image";
import { useState } from "react";
import DashboardGuard from "@/components/DashboardGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Users, 
  Trash2, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import LocationManager from "@/components/company/LocationManager";
import UserLocationAssignment from "@/components/company/UserLocationAssignment";
import { useCompanyData } from "@/hooks/use-company-data";
import { CompanyProfileSkeleton, TeamMembersSkeleton, LoadingState, ErrorState } from "@/components/ui/loading-states";

interface CompanyProfile {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  industry?: string;
  website?: string;
  logo?: string;
  address?: any;
  email?: string;
  phone?: string;
  size?: string;
  businessType?: string;
  registrationNumber?: string;
  taxId?: string;
  createdAt: string;
  updatedAt: string;
}

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  role: string;
  title?: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  isOwner: boolean;
  joinedAt?: string;
  lastActive?: string;
  departmentId?: string;
  type: 'user' | 'invite';
  createdAt?: string;
  expiresAt?: string;
}

interface InviteForm {
  emails: string;
  role: string;
}

const ROLES = [
  'ADMIN',
  'MANAGER',
  'SUPERVISOR', 
  'EMPLOYEE',
  'CONTRACTOR',
  'VIEWER'
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Construction',
  'Other'
];

export default function CompanyProfilePage() {
  const router = useRouter();
  const {
    companyProfile,
    teamMembers,
    userRole,
    isOwner,
    loading,
    error,
    refetch,
    updateCompany,
    inviteUsers
  } = useCompanyData();

  const [inviteForm, setInviteForm] = useState<InviteForm>({ emails: '', role: 'VIEWER' });
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editData, setEditData] = useState<Partial<CompanyProfile>>({});

  // Handle loading state
  if (loading) {
    return (
      <DashboardGuard>
        <CompanyProfileSkeleton />
      </DashboardGuard>
    );
  }

  // Handle error state
  if (error) {
    return (
      <DashboardGuard>
        <ErrorState 
          message="Failed to load company data"
          description={error}
          onRetry={refetch}
        />
      </DashboardGuard>
    );
  }

  // Handle no company case
  if (!companyProfile) {
    return (
      <DashboardGuard>
        <div className="container mx-auto py-6">
          <Card>
            <CardHeader>
              <CardTitle>No Company Found</CardTitle>
              <CardDescription>
                You don't seem to be associated with any company yet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/auth/company-signup')}>
                Create Company
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardGuard>
    );
  }

  const handleInviteUsers = async () => {
    if (!inviteForm.emails.trim() || !inviteForm.role) return;

    setIsInviting(true);
    setMessage(null);
    
    try {
      const success = await inviteUsers(inviteForm.emails, inviteForm.role);
      
      if (success) {
        setMessage({ type: 'success', text: 'Invitations sent successfully!' });
        setInviteForm({ emails: '', role: 'VIEWER' });
        setShowInviteDialog(false);
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: 'Failed to send invitations. Please try again.' });
      }
    } catch (error) {
      console.error('Error inviting users:', error);
      setMessage({ type: 'error', text: 'Failed to send invitations. Please try again.' });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateCompany = async () => {
    if (Object.keys(editData).length === 0) return;

    setIsUpdating(true);
    setMessage(null);
    
    try {
      const success = await updateCompany(editData);
      
      if (success) {
        setMessage({ type: 'success', text: 'Company profile updated successfully!' });
        setEditData({});
        setTimeout(() => setMessage(null), 5000);
      } else {
        setMessage({ type: 'error', text: 'Failed to update company profile. Please try again.' });
      }
    } catch (error) {
      console.error('Error updating company:', error);
      setMessage({ type: 'error', text: 'Failed to update company profile. Please try again.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const formatLastActive = (date?: string) => {
    if (!date) return 'Never';
    const now = new Date();
    const lastActive = new Date(date);
    const diffInHours = Math.floor((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return lastActive.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'ACTIVE':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleInputChange = (field: keyof CompanyProfile, value: string) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <DashboardGuard>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Profile</h1>
            <p className="text-muted-foreground">
              Manage your company information and team members
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={refetch}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
            <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Company Information */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Company Information
                  </CardTitle>
                  <CardDescription>
                    Update your company's basic information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company Name</Label>
                      <Input
                        id="company-name"
                        value={editData.name ?? companyProfile.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry</Label>
                      <Select value={editData.industry ?? companyProfile.industry} onValueChange={(value) => handleInputChange('industry', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {INDUSTRIES.map((industry) => (
                            <SelectItem key={industry} value={industry}>
                              {industry}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={editData.website ?? companyProfile.website ?? ''}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editData.email ?? companyProfile.email ?? ''}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="company@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={editData.phone ?? companyProfile.phone ?? ''}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editData.description ?? companyProfile.description ?? ''}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Tell us about your company..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleUpdateCompany} disabled={isUpdating || Object.keys(editData).length === 0}>
                    {isUpdating ? 'Updating...' : 'Update Profile'}
                  </Button>
                </CardContent>
              </Card>

              {/* Company Logo */}
              <Card>
                <CardHeader>
                  <CardTitle>Company Logo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col items-center space-y-4">
                    {companyProfile.logo ? (
                      <Image
                        src={companyProfile.logo}
                        alt="Company Logo"
                        width={128}
                        height={128}
                        className="rounded-lg border"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <Button variant="outline" size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Logo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            {loading ? (
              <TeamMembersSkeleton />
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        Team Members ({teamMembers.length})
                      </CardTitle>
                      <CardDescription>
                        Manage your team members and their roles
                      </CardDescription>
                    </div>
                    {(isOwner || ['ADMIN', 'MANAGER'].includes(userRole || '')) && (
                      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                        <DialogTrigger asChild>
                          <Button>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite Users
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Team Members</DialogTitle>
                            <DialogDescription>
                              Send invitations to join your company. Enter email addresses separated by commas.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="invite-emails">Email Addresses</Label>
                              <Textarea
                                id="invite-emails"
                                placeholder="user1@example.com, user2@example.com"
                                value={inviteForm.emails}
                                onChange={(e) => setInviteForm(prev => ({ ...prev, emails: e.target.value }))}
                                rows={3}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="invite-role">Role</Label>
                              <Select value={inviteForm.role} onValueChange={(value) => setInviteForm(prev => ({ ...prev, role: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLES.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleInviteUsers} disabled={isInviting || !inviteForm.emails.trim()}>
                                {isInviting ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Invites
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {teamMembers.length > 0 ? (
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              {member.avatar ? (
                                <Image src={member.avatar} alt="" width={40} height={40} className="rounded-full" />
                              ) : (
                                <span className="text-sm font-medium text-gray-600">
                                  {member.displayName ? member.displayName.charAt(0).toUpperCase() :
                                   member.firstName ? member.firstName.charAt(0).toUpperCase() :
                                   member.email.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">
                                {member.displayName || 
                                 (member.firstName && member.lastName ? `${member.firstName} ${member.lastName}` : 
                                  member.email)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {member.email} • {member.role}
                                {member.title && ` • ${member.title}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {member.type === 'invite' ? 'Invited' : 'Last active'}: {formatLastActive(member.lastActive || member.createdAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(member.status)}
                            {member.isOwner && (
                              <Badge variant="secondary">Owner</Badge>
                            )}
                            {(isOwner || ['ADMIN'].includes(userRole || '')) && !member.isOwner && (
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                      <p className="text-gray-500 mb-4">Start building your team by inviting members.</p>
                      {(isOwner || ['ADMIN', 'MANAGER'].includes(userRole || '')) && (
                        <Button onClick={() => setShowInviteDialog(true)}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Invite First Member
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>          <TabsContent value="locations" className="space-y-6">
            <LocationManager companyId={companyProfile.id} />
            <UserLocationAssignment companyId={companyProfile.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardGuard>
  );
}
