import { useState } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeUrl: string;
  candidateName: string;
  recruitId: string;
}

export default function ResumePreviewModal({ 
  isOpen, 
  onClose, 
  resumeUrl, 
  candidateName,
  recruitId 
}: ResumePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

  if (!isOpen) return null;

  // Convert URL for inline viewing - backend now handles this, so we use the URL as-is
  const getPreviewUrl = (url: string) => {
    // If we need to use proxy due to CORS or other issues
    if (useProxy && recruitId) {
      return `${API_BASE_URL}/recruits/${recruitId}/resume/proxy`;
    }
    
    // The backend preview endpoint already optimizes Cloudinary URLs
    // Just return the URL as provided
    return url;
  };

  // Get download URL with proper filename
  const getDownloadUrl = (forceDownload = false) => {
    if (recruitId) {
      const downloadParam = forceDownload ? '?download=true' : '';
      return `${API_BASE_URL}/recruits/${recruitId}/resume/proxy${downloadParam}`;
    }
    return resumeUrl;
  };

  const downloadUrl = getDownloadUrl();
  const forceDownloadUrl = getDownloadUrl(true);
  const previewUrl = getPreviewUrl(resumeUrl);

  // Handle iframe load error
  const handleIframeError = () => {
    console.error('Resume preview failed to load:', resumeUrl);
    
    // If we're not already using proxy, try the proxy endpoint
    if (!useProxy) {
      console.log('Attempting to use proxy endpoint...');
      setUseProxy(true);
      setIsLoading(true);
      setPreviewError(false);
      return;
    }
    
    // If proxy also failed, show error
    setPreviewError(true);
    setIsLoading(false);
  };

  // Handle iframe load success
  const handleIframeLoad = () => {
    console.log('Resume preview loaded successfully:', resumeUrl);
    setIsLoading(false);
    setPreviewError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-2xl w-11/12 h-5/6 max-w-6xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">
              Resume Preview
            </h3>
            <p className="text-sm text-gray-600">{candidateName}</p>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Open
            </a>
            <a
              href={forceDownloadUrl}
              download
              className="flex items-center px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              title="Download resume"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              title="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading resume preview...</p>
              </div>
            </div>
          )}

          {previewError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
              <div className="text-center max-w-md">
                <div className="mb-4">
                  <X className="w-16 h-16 text-red-400 mx-auto mb-2" />
                  <h4 className="text-lg font-medium text-gray-800">Preview Unavailable</h4>
                  <p className="text-gray-600 mt-2">
                    This file format cannot be previewed in the browser. 
                    Please download the file to view it.
                  </p>
                </div>
                <div className="space-x-2">
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in New Tab
                  </a>
                  <a
                    href={forceDownloadUrl}
                    download
                    className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          )}
          
          <iframe
            src={previewUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title={`Resume - ${candidateName}`}
            style={{ display: previewError ? 'none' : 'block' }}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t bg-gray-50 rounded-b-lg">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Tip:</span> Use Ctrl+F to search within the document
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
