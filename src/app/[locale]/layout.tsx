import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import "../globals.css";
import { Providers } from "./providers";
import { NewVersionNotice } from "@/components/system/NewVersionNotice";
import { MarketingPixels } from "@/components/marketing/MarketingPixels";
import { OutOfCreditsModal } from "@/components/billing/OutOfCreditsModal";
import { NotificationCenter } from "@/components/system/NotificationCenter";
import { uiLocales } from '@/i18n/routing';
import RouteTracker from '@/components/analytics/RouteTracker';
import ReferralCapture from '@/components/affiliate/ReferralCapture';

const GA_ID = process.env.NEXT_PUBLIC_GA4_ID || '';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});



type SupportedLocale = (typeof uiLocales)[number]

// 动态元数据生成
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'layout' })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return {
        metadataBase: new URL(appUrl),
        title: t('title'),
        description: t('description'),
        icons: {
            icon: [
                { url: '/favicon.ico', sizes: '48x48' },
                { url: '/icon.png', type: 'image/png', sizes: '192x192' },
            ],
            shortcut: '/favicon.ico',
            apple: '/apple-touch-icon.png',
        },
        openGraph: {
            url: appUrl,
            title: t('title'),
            description: t('description'),
            images: [{ url: '/banner.png', width: 1280, height: 640 }],
        },
        twitter: {
            card: 'summary_large_image',
            images: ['/banner.png'],
        },
        other: {
            generator: 'NucleusArt',
        },
    };
}

export function generateStaticParams() {
    return uiLocales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;

    // 验证 locale 是否有效
    if (!uiLocales.includes(locale as SupportedLocale)) {
        notFound();
    }

    // 获取翻译消息
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <head>
                {process.env.NODE_ENV === "development" && (
                    <Script
                        src="//unpkg.com/react-grab/dist/index.global.js"
                        crossOrigin="anonymous"
                        strategy="beforeInteractive"
                    />
                )}
            </head>
            <body
                className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
            >
                {GA_ID && (
                    <>
                        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
                        <Script id="ga4-init" strategy="afterInteractive">{`
                            window.dataLayer=window.dataLayer||[];
                            function gtag(){dataLayer.push(arguments);}
                            gtag('js',new Date());
                            gtag('config','${GA_ID}');
                        `}</Script>
                    </>
                )}
                <NextIntlClientProvider messages={messages}>
                    <Providers>
                        {children}
                        <NewVersionNotice />
                        <MarketingPixels />
                        <OutOfCreditsModal />
                        <NotificationCenter />
                    </Providers>
                </NextIntlClientProvider>
                <ReferralCapture />
                {GA_ID && <RouteTracker />}
            </body>
        </html>
    );
}
