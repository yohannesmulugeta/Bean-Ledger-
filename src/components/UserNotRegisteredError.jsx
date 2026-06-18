import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full p-8 bg-card rounded-2xl shadow-sm border border-border">
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-5">
            <img
              src="https://media.base44.com/images/public/6a3288c4b01eb57cd2f94a14/8fc255d08_generated_image.png"
              alt="BeanLedger Export"
              className="w-10 h-10 object-contain opacity-50"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Restricted</h1>
          <p className="text-muted-foreground mb-6">
            You are not registered to use BeanLedger Export. Sign up for a free demo account to get started.
          </p>
          <Button
            className="w-full h-12 font-medium mb-3"
            onClick={() => window.location.href = '/register'}
          >
            Sign up now
          </Button>
          <button
            onClick={() => base44.auth.logout('/login')}
            className="text-sm text-muted-foreground hover:text-foreground font-medium"
          >
            Try a different account
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;