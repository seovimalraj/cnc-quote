'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  CheckCircle,
  Sparkles,
  Shield,
  Clock,
  Zap,
  Award,
  Users,
  Package,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  FileCheck,
  HeadphonesIcon,
  X,
  Loader2,
  LogIn,
  UserPlus,
  Eye,
  ArrowRight
} from 'lucide-react';
import { createQuote, uploadFile, getFileDownloadUrl } from '../../lib/database';
import { analyzeCADFile, GeometryData } from '../../lib/cad-analysis';
import { calculatePricing, getMaterial, getFinish, PROCESSES, PricingBreakdown } from '../../lib/pricing-engine';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Dynamically import 3D viewer to avoid SSR issues
const CadViewer3D = dynamic(() => import('@/components/viewer/CadViewer3D'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  ),
});

interface UploadedFileData {
  file: File;
  uploadedPath: string;
  name: string;
  size: number;
  mimeType: string;
  geometry?: GeometryData;
  pricing?: PricingBreakdown;
}

export default function InstantQuotePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [show3DViewer, setShow3DViewer] = useState(false);
  const [selected3DFile, setSelected3DFile] = useState<UploadedFileData | null>(null);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [quoteId, setQuoteId] = useState<string>('');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
    company: ''
  });


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadAndAuth = async () => {
    if (files.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setIsUploading(true);
    
    try {
      // Analyze files and prepare for quote configuration
      const uploadResults: UploadedFileData[] = [];
      
      for (const file of files) {
        // Analyze CAD geometry
        console.log(`Analyzing CAD file: ${file.name}`);
        const geometry = await analyzeCADFile(file);
        console.log(`Geometry analysis complete:`, geometry);
        
        // Create mock storage path (will be uploaded later in quote-config)
        const mockPath = `quotes/temp-${Date.now()}/${file.name}`;
        
        uploadResults.push({
          file,
          uploadedPath: mockPath,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          geometry
        });
      }
      
      setUploadedFiles(uploadResults);
      
      // Generate temporary quote ID (no database call to avoid 502)
      const tempQuoteId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Store files in sessionStorage for quote-config page
      const filesData = uploadResults.map(r => ({
        name: r.name,
        size: r.size,
        type: r.mimeType,
        geometry: r.geometry,
        path: r.uploadedPath
      }));
      
      // Store metadata
      sessionStorage.setItem(`quote-${tempQuoteId}-files`, JSON.stringify(filesData));
      sessionStorage.setItem(`quote-${tempQuoteId}-email`, `guest-${Date.now()}@temp.quote`);
      
      // Store actual file data as base64
      const filePromises = uploadResults.map((result, i) => {
        return new Promise<void>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            sessionStorage.setItem(`quote-${tempQuoteId}-file-${i}`, reader.result as string);
            resolve();
          };
          reader.readAsDataURL(result.file);
        });
      });
      
      // Wait for all files to be stored
      await Promise.all(filePromises);
      
      console.log(`Files stored in sessionStorage. Redirecting to quote config: ${tempQuoteId}`);
      
      // Redirect to quote config immediately
      router.push(`/quote-config/${tempQuoteId}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      alert(`Failed to process files: ${error.message || 'Please try again'}`);
      setIsUploading(false);
    }
  };

  const handle3DPreview = async (uploadedFile: UploadedFileData) => {
    // Check if file is 3D viewable (STL, STEP, OBJ)
    const ext = uploadedFile.name.toLowerCase().split('.').pop();
    if (!ext || !['stl', 'step', 'stp', 'obj'].includes(ext)) {
      alert('This file type cannot be previewed in 3D viewer');
      return;
    }
    
    try {
      // For uploaded files, we already have the path
      // Just need to get download URL if it's from storage
      let viewerUrl = uploadedFile.uploadedPath;
      
      // If the path looks like a storage path, get signed URL
      if (uploadedFile.uploadedPath.startsWith('quotes/') || uploadedFile.uploadedPath.startsWith('/')) {
        viewerUrl = await getFileDownloadUrl(uploadedFile.uploadedPath);
      }
      
      setSelected3DFile({
        ...uploadedFile,
        uploadedPath: viewerUrl,
      });
      setShow3DViewer(true);
    } catch (error) {
      console.error('Failed to get download URL:', error);
      alert('Failed to load 3D preview');
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mock auth for now - in production this would call auth API
    if (authMode === 'signup' && !authForm.name) {
      alert('Please enter your name');
      return;
    }
    if (!authForm.email || !authForm.password) {
      alert('Please enter email and password');
      return;
    }

    // Close modal and redirect to quote config
    setShowAuthModal(false);
    router.push(`/quote-config/${quoteId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Professional Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Frigate CNC
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Home
              </Link>
              <Link href="/instant-quote" className="text-blue-600 dark:text-blue-400 font-medium">
                Instant Quote
              </Link>
              <Link href="/about" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                Contact
              </Link>
            </nav>

            {/* Trust Badges & CTA */}
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-700 dark:text-green-400">ISO 9001 Certified</span>
              </div>
              <Link href="/signin">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Trust Bar */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>As fast as 24-hour lead time</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>100% Quality Guaranteed</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>10,000+ Happy Customers</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>Industry-Leading Accuracy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800">
            <Zap className="w-3 h-3 mr-1" />
            AI-Powered Instant Quotes
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Get Your CNC Machining Quote in
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Seconds</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Upload your CAD files and get instant pricing with AI-powered manufacturability analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Upload Zone */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Upload Your CAD Files</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Supports STEP, IGES, STL, DXF, and more</p>
                  </div>
                </div>

                <div 
                  className="border-4 border-dashed border-blue-300 dark:border-blue-700 rounded-2xl p-16 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-all bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:shadow-lg"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('border-blue-500', 'dark:border-blue-400', 'bg-blue-100', 'dark:bg-blue-900/40');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('border-blue-500', 'dark:border-blue-400', 'bg-blue-100', 'dark:bg-blue-900/40');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('border-blue-500', 'dark:border-blue-400', 'bg-blue-100', 'dark:bg-blue-900/40');
                    const droppedFiles = Array.from(e.dataTransfer.files);
                    setFiles(prev => [...prev, ...droppedFiles as File[]]);
                  }}
                >
                  <div className="mb-6 relative">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center transform hover:scale-110 transition-transform shadow-xl">
                      <Upload className="w-12 h-12 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 left-0 right-0 mx-auto w-24">
                      <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    Drop your CAD files here
                  </h3>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                    or click below to browse from your computer
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".stl,.step,.stp,.iges,.igs,.dxf,.dwg,.x_t,.x_b"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload">
                    <Button 
                      variant="default" 
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all" 
                      asChild
                      disabled={isUploading}
                    >
                      <span>
                        <Upload className="w-5 h-5 mr-2" />
                        Browse Files
                      </span>
                    </Button>
                  </label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-6 flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Supports: STEP, IGES, STL, DXF, DWG, Parasolid • Max 50MB per file
                  </p>
                </div>

                {files.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-green-600" />
                        Uploaded Files ({files.length})
                      </h3>
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Ready
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      {files.map((file, index) => {
                        const canPreview3D = ['stl', 'step', 'stp', 'obj'].includes(
                          file.name.toLowerCase().split('.').pop() || ''
                        );
                        
                        return (
                          <Card key={index} className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-shadow">
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                                    <FileText className="w-6 h-6 text-white" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-white truncate mb-1">{file.name}</p>
                                    <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 mb-2">
                                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                      <span>•</span>
                                      <span className="uppercase">{file.name.split('.').pop()}</span>
                                      {canPreview3D && (
                                        <>
                                          <span>•</span>
                                          <Badge className="bg-green-600 text-white text-xs">
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            3D Viewable
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeFile(index)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 flex-shrink-0"
                                  disabled={isUploading}
                                >
                                  <X className="w-5 h-5" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end items-center mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                  <Button
                    onClick={handleUploadAndAuth}
                    disabled={files.length === 0 || isUploading}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing Files...
                      </>
                    ) : (
                      <>
                        Continue to Quote Configuration
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>


          {/* AI Insights Sidebar */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800 shadow-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-slate-900 dark:text-white">What Happens Next?</h3>
              </div>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 border border-blue-300 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <Upload className="w-5 h-5 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">1. Upload Files</h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300">Upload your CAD files - we support all major formats</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-300 dark:border-green-800">
                  <div className="flex items-start gap-3">
                    <UserPlus className="w-5 h-5 mt-0.5 text-green-600 dark:text-green-400" />
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">2. Sign Up / Sign In</h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300">Create an account or sign in to view your quote</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-300 dark:border-purple-800">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 mt-0.5 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white mb-1">3. Configure & Order</h4>
                      <p className="text-xs text-slate-700 dark:text-slate-300">Review AI-powered quote and place your order</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Trust Signals */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-slate-200 dark:border-slate-800 p-6">
              <h3 className="font-bold text-slate-900 dark:text-white mb-4">Why Choose Frigate CNC?</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Fast Turnaround</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">As fast as 24-hour production</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Quality Guaranteed</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">ISO 9001 certified facilities</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Award className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Expert Support</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Engineering team available 24/7</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <DollarSign className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Best Pricing</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400">Competitive rates, no hidden fees</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Contact Card */}
            <Card className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6">
              <h3 className="font-bold mb-4">Need Help?</h3>
              <p className="text-sm mb-4 text-blue-100">Our engineering team is ready to assist with your project</p>
              <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">
                <HeadphonesIcon className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
            </DialogTitle>
            <DialogDescription>
              {authMode === 'signup' 
                ? 'Sign up to view your instant quote and place orders' 
                : 'Sign in to continue to your quote'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleAuth} className="space-y-4 mt-4">
            {authMode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={authForm.name}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Input
                    id="company"
                    placeholder="Acme Corporation"
                    value={authForm.company}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={authForm.email}
                onChange={(e) => setAuthForm(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={authForm.password}
                onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {authMode === 'signup' ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account & View Quote
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In & View Quote
                </>
              )}
            </Button>

            <div className="text-center text-sm">
              {authMode === 'signup' ? (
                <p className="text-slate-600 dark:text-slate-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className="text-blue-600 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p className="text-slate-600 dark:text-slate-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="text-blue-600 hover:underline"
                  >
                    Sign up
                  </button>
                </p>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3D Viewer Dialog */}
      <Dialog open={show3DViewer} onOpenChange={setShow3DViewer}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Eye className="w-6 h-6 text-blue-600" />
              3D Model Viewer
            </DialogTitle>
            <DialogDescription>
              {selected3DFile?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="h-[70vh] p-6 pt-2">
            {selected3DFile && (
              <CadViewer3D
                modelUrl={selected3DFile.uploadedPath}
                fileType={selected3DFile.name.toLowerCase().split('.').pop() as 'stl' | 'step' | 'obj' | 'stp'}
                width="100%"
                height="100%"
                showMeasurementTools={true}
                showCrossSectionControls={true}
                backgroundColor="#f8fafc"
                enableShadows={true}
                units="mm"
              />
            )}
          </div>

          <div className="p-6 pt-2 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShow3DViewer(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Professional Footer */}
      <footer className="bg-slate-900 text-slate-300 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Company Info */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-white">Frigate CNC</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Leading CNC machining services with AI-powered instant quotes and industry-best quality.
              </p>
              <div className="flex gap-3">
                <div className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors">
                  <Facebook className="w-4 h-4" />
                </div>
                <div className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors">
                  <Twitter className="w-4 h-4" />
                </div>
                <div className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors">
                  <Linkedin className="w-4 h-4" />
                </div>
                <div className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors">
                  <Instagram className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="font-bold text-white mb-4">Services</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-blue-400 transition-colors">CNC Machining</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition-colors">3D Printing</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition-colors">Sheet Metal</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition-colors">Injection Molding</Link></li>
                <li><Link href="/instant-quote" className="hover:text-blue-400 transition-colors">Instant Quote</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h4 className="font-bold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-blue-400 transition-colors">Design Guidelines</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition-colors">Material Guide</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition-colors">Finish Options</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition-colors">Case Studies</Link></li>
                <li><Link href="#" className="hover:text-blue-400 transition-colors">Blog</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-white mb-4">Contact Us</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-blue-400" />
                  <span>+1 (555) 123-4567</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 text-blue-400" />
                  <span>support@frigatecnc.com</span>
                </li>
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 text-blue-400" />
                  <span>123 Manufacturing St<br />San Francisco, CA 94105</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-slate-400">
                © 2024 Frigate CNC. All rights reserved.
              </p>
              <div className="flex gap-6 text-sm">
                <Link href="#" className="hover:text-blue-400 transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-blue-400 transition-colors">Terms of Service</Link>
                <Link href="#" className="hover:text-blue-400 transition-colors">Cookies</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
