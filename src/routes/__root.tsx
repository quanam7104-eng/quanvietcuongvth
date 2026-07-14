import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { heartbeatDevice } from "@/lib/devices.functions";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Quán Viết Cường -225D10027" },
      { name: "description", content: "Sản phẩm của sinh viên Trường Đại học Hùng Vương. HVU- Quán Viết Cường nhằm hỗ trợ việc rà soát hóa đơn lệch khi lên tờ khai." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Quán Viết Cường -225D10027" },
      { property: "og:description", content: "Sản phẩm của sinh viên Trường Đại học Hùng Vương. HVU- Quán Viết Cường nhằm hỗ trợ việc rà soát hóa đơn lệch khi lên tờ khai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Quán Viết Cường -225D10027" },
      { name: "twitter:description", content: "Sản phẩm của sinh viên Trường Đại học Hùng Vương. HVU- Quán Viết Cường nhằm hỗ trợ việc rà soát hóa đơn lệch khi lên tờ khai." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/78820de8-5245-4b66-b6d6-9bb9a220e6aa/id-preview-e83db0cc--bbfe6594-eba2-47d4-b609-c47434f6c2ba.lovable.app-1781722880119.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/78820de8-5245-4b66-b6d6-9bb9a220e6aa/id-preview-e83db0cc--bbfe6594-eba2-47d4-b609-c47434f6c2ba.lovable.app-1781722880119.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const clearSession = () => {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) {
            localStorage.removeItem(k);
          }
        }
      } catch {}
    };
    window.addEventListener("beforeunload", clearSession);
    window.addEventListener("pagehide", clearSession);
    return () => {
      window.removeEventListener("beforeunload", clearSession);
      window.removeEventListener("pagehide", clearSession);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const DEVICE_KEY = "hvu_device_id";
    let deviceId = localStorage.getItem(DEVICE_KEY);
    if (!deviceId) {
      deviceId =
        (crypto as any)?.randomUUID?.() ??
        `d_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      localStorage.setItem(DEVICE_KEY, deviceId);
    }

    async function tick() {
      if (stopped) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        const res = await heartbeatDevice({
          data: { deviceId: deviceId!, userAgent: navigator.userAgent.slice(0, 500) },
        });
        if (res?.revoked) {
          await supabase.auth.signOut();
          if (window.location.pathname !== "/auth") {
            window.location.replace("/auth?kicked=1");
          }
        }
      } catch (e) {
        // ignore transient errors
      }
    }

    tick();
    timer = setInterval(tick, 20_000);

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") tick();
    });

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
