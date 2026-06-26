import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface AdminFormDrawerProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const AdminFormDrawer: React.FC<AdminFormDrawerProps> = ({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
}) => (
  <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
    <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
      <SheetHeader className="border-b px-4 py-4 sm:px-5">
        <SheetTitle className="text-left">{title}</SheetTitle>
        {subtitle && <SheetDescription className="text-left">{subtitle}</SheetDescription>}
      </SheetHeader>
      <div className="flex-1 overflow-y-auto min-w-0 px-4 py-4 sm:px-5">
        <div className="space-y-4 sm:space-y-5">{children}</div>
      </div>
      {footer && <SheetFooter className="border-t px-4 py-3 sm:px-5">{footer}</SheetFooter>}
    </SheetContent>
  </Sheet>
);

export default AdminFormDrawer;
