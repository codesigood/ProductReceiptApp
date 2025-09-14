
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface CompanyProfile {
  name: string;
  address: string;
  phone: string;
  tax_rate: number;
}

interface ValidationErrors {
  name?: string;
  address?: string;
  phone?: string;
  tax_rate?: string;
}

const CompanyProfile: React.FC = () => {
  const { token } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile>({ name: '', address: '', phone: '', tax_rate: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const validateProfile = (profile: CompanyProfile) => {
    const errors: ValidationErrors = {};
    if (!profile.name.trim()) {
      errors.name = 'Company name is required';
    }
    if (!profile.address.trim()) {
      errors.address = 'Address is required';
    }
    if (!profile.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    if (isNaN(profile.tax_rate) || profile.tax_rate < 0) {
      errors.tax_rate = 'Tax rate must be a positive number';
    }
    return errors;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!token) {
          setError("Authentication token not found.");
          setLoading(false);
          return;
        }
        const response = await window.electron.ipcRenderer.invoke('companyProfile:get', { token });
        if (response.success && response.profile) {
          setProfile(response.profile);
        } else if (response.message) {
          setError(response.message);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch company profile.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchProfile();
    }
  }, [token]);

  const handleSave = async () => {
    const errors = validateProfile(profile);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const response = await window.electron.ipcRenderer.invoke('companyProfile:update', { token, ...profile });
      if (response.success) {
        setMessage("Company profile saved successfully!");
      } else {
        setError(response.message || "Failed to save company profile.");
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile.name) return <div>Loading company profile...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert variant="default">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">Company Name</Label>
          <Input
            id="name"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          {validationErrors.name && <p className="text-red-500 text-sm">{validationErrors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />
          {validationErrors.address && <p className="text-red-500 text-sm">{validationErrors.address}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          {validationErrors.phone && <p className="text-red-500 text-sm">{validationErrors.phone}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax_rate">Tax Rate (%)</Label>
          <Input
            id="tax_rate"
            type="number"
            value={profile.tax_rate}
            onChange={(e) => setProfile({ ...profile, tax_rate: parseFloat(e.target.value) })}
          />
          {validationErrors.tax_rate && <p className="text-red-500 text-sm">{validationErrors.tax_rate}</p>}
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CompanyProfile;
