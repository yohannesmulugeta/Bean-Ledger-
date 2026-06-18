import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-5">
            <img
              src="https://media.base44.com/images/public/6a3288c4b01eb57cd2f94a14/8fc255d08_generated_image.png"
              alt="BeanLedger Export"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            BeanLedger Export
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-wide uppercase font-medium">
            Coffee Export Operations Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}