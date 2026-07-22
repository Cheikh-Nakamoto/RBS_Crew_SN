-- ============================================================================
-- RBS Crew SN — SCHÉMA DE RÉFÉRENCE UNIQUE
--
-- Ce fichier est l'unique source de vérité du schéma. Il est exécuté :
--   * par Postgres à la création de la base (docker-entrypoint-initdb.d/02-schema.sql)
--   * par sqlc pour générer internal/db/queries/
--
-- RÈGLE : uniquement des CREATE TYPE / CREATE TABLE / CREATE INDEX.
-- Jamais d'ALTER TABLE — une évolution de schéma se fait en éditant les
-- définitions ci-dessous, puis en recréant la base (`make db-reset`).
--
-- ⚠️  AVERTISSEMENT — MODÈLE « BASE JETABLE »
-- Il n'existe plus de migrations incrémentales. Toute évolution du schéma
-- DÉTRUIT l'intégralité des données : commandes, paiements, comptes clients et
-- remboursements compris. Ce modèle n'est tenable que tant que la base ne
-- contient que des données de démo réimportables depuis migration-scripts/.
--
-- SIGNAL DE BASCULE OBLIGATOIRE — réintroduire des migrations incrémentales
-- AVANT la prochaine évolution de schéma dès que l'une de ces conditions est
-- vraie :
--   * un premier paiement réel a été encaissé (ligne "Payment" en status 'PAID')
--   * un compte utilisateur réel non réimportable existe
--   * le service est ouvert au public / une mise en production est annoncée
--
-- La bascule devra s'accompagner d'une vérification en CI (diff de pg_dump
-- entre les deux voies) : la divergence constatée en juillet 2026 entre les
-- migrations goose et ce fichier (FK Order_shippingMethodId_fkey, index
-- Order_trackingNumber_idx et valeur d'enum NABOO manquants) a prouvé que la
-- seule discipline ne suffit pas.
-- ============================================================================

-- ── Types ───────────────────────────────────────────────────────────────────
CREATE TYPE "Locale" AS ENUM (
    'fr',
    'en',
    'de',
    'es',
    'it'
);
CREATE TYPE "OrderStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED',
    'REFUNDED',
    'FAILED'
);
CREATE TYPE "PaymentMethod" AS ENUM (
    'STRIPE',
    'PAYPAL',
    'WAVE',
    'ORANGE_MONEY',
    'NABOO'
);
CREATE TYPE "PaymentStatus" AS ENUM (
    'UNPAID',
    'PAID',
    'PARTIALLY_REFUNDED',
    'REFUNDED'
);
CREATE TYPE "ProductStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);
CREATE TYPE "RefundStatus" AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED',
    'CANCELLED'
);
CREATE TYPE "UserRole" AS ENUM (
    'CUSTOMER',
    'ADMIN',
    'EDITOR',
    'ARTIST'
);

-- Demande d'un client se déclarant artiste RBS. Un administrateur la valide en
-- rattachant le compte à une fiche Artist précise (voir Artist."userId").
CREATE TYPE "ArtistClaimStatus" AS ENUM (
    'NONE',
    'PENDING',
    'APPROVED',
    'REJECTED'
);

-- ── Tables (ordre topologique — FK déclarées en ligne) ───────────────────────

CREATE TABLE "ActivityLog" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "userEmail" text NOT NULL,
    method text NOT NULL,
    path text NOT NULL,
    "entityType" text DEFAULT ''::text NOT NULL,
    "entityId" text,
    "statusCode" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY (id)
);

CREATE TABLE "User" (
    id text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "firstName" text,
    "lastName" text,
    phone text,
    role "UserRole" DEFAULT 'CUSTOMER'::"UserRole" NOT NULL,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "preferredLocale" "Locale" DEFAULT 'fr'::"Locale" NOT NULL,
    "wcId" integer,
    "resetToken" text,
    "resetTokenExpiry" timestamp(3) without time zone,
    "emailVerificationToken" text,
    "emailVerificationTokenExpiry" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    -- Auto-déclaration « je suis un artiste RBS ». Le rôle ARTIST n'est accordé
    -- qu'après validation par un administrateur, qui rattache aussi la fiche.
    "artistClaimStatus" "ArtistClaimStatus" DEFAULT 'NONE'::"ArtistClaimStatus" NOT NULL,
    "artistClaimNote" text,
    "artistClaimAt" timestamp(3) without time zone,

    CONSTRAINT "User_pkey" PRIMARY KEY (id)
);

CREATE TABLE "Address" (
    id text NOT NULL,
    "userId" text NOT NULL,
    label text,
    "firstName" text NOT NULL,
    "lastName" text NOT NULL,
    company text,
    line1 text NOT NULL,
    line2 text,
    city text NOT NULL,
    "postalCode" text NOT NULL,
    country text DEFAULT 'SN'::text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY (id),
    CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "Artist" (
    id text NOT NULL,
    slug text NOT NULL,
    city text,
    country text,
    "avatarUrl" text,
    "featuredImageUrl" text,
    "instagramUrl" text,
    genre text,
    nationality text,
    "facebookUrl" text,
    "twitterUrl" text,
    "youtubeUrl" text,
    "tiktokUrl" text,
    "websiteUrl" text,
    "spotifyUrl" text,
    "soundcloudUrl" text,
    "videoUrl" text,
    status "ProductStatus" DEFAULT 'PUBLISHED'::"ProductStatus" NOT NULL,
    "wpId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    -- Compte permettant à l'artiste de gérer sa propre fiche. NULL tant qu'aucun
    -- compte n'a été rattaché ; ON DELETE SET NULL pour que la suppression d'un
    -- compte n'efface jamais la fiche publique.
    "userId" text,

    CONSTRAINT "Artist_pkey" PRIMARY KEY (id),
    CONSTRAINT "Artist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE "ArtistArtwork" (
    id text NOT NULL,
    "artistId" text NOT NULL,
    "imageUrl" text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,

    CONSTRAINT "ArtistArtwork_pkey" PRIMARY KEY (id),
    CONSTRAINT "ArtistArtwork_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ArtistTranslation" (
    id text NOT NULL,
    "artistId" text NOT NULL,
    locale "Locale" NOT NULL,
    name text NOT NULL,
    bio text,

    CONSTRAINT "ArtistTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "ArtistTranslation_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "Category" (
    id text NOT NULL,
    slug text NOT NULL,
    "parentId" text,
    "wpId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY (id),
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE "CategoryTranslation" (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    locale "Locale" NOT NULL,
    name text NOT NULL,
    description text,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "FestivalEdition" (
    id text NOT NULL,
    slug text NOT NULL,
    "editionNumber" integer NOT NULL,
    year integer NOT NULL,
    city text,
    country text DEFAULT 'SN'::text NOT NULL,
    status "ProductStatus" DEFAULT 'PUBLISHED'::"ProductStatus" NOT NULL,
    "wpId" integer,
    "mainImage" text,
    "heroImage" text,
    gallery jsonb,
    typography jsonb,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    venue text,
    "venueAddress" text,
    "ticketUrl" text,
    "videoUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,

    CONSTRAINT "FestivalEdition_pkey" PRIMARY KEY (id)
);

CREATE TABLE "FestivalArtist" (
    id text NOT NULL,
    "festivalEditionId" text NOT NULL,
    "artistId" text NOT NULL,
    "performanceDate" timestamp(3) without time zone,
    "stageOrder" integer DEFAULT 0 NOT NULL,
    role text DEFAULT 'performer'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "FestivalArtist_pkey" PRIMARY KEY (id),
    CONSTRAINT "FestivalArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "FestivalArtist_festivalEditionId_fkey" FOREIGN KEY ("festivalEditionId") REFERENCES "FestivalEdition"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "FestivalTranslation" (
    id text NOT NULL,
    "festivalEditionId" text NOT NULL,
    locale "Locale" NOT NULL,
    "themeName" text NOT NULL,
    summary text,
    content text,

    CONSTRAINT "FestivalTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "FestivalTranslation_festivalEditionId_fkey" FOREIGN KEY ("festivalEditionId") REFERENCES "FestivalEdition"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ShippingMethod" (
    id text NOT NULL,
    code text NOT NULL,
    "isPickup" boolean DEFAULT false NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    "estimatedDaysMin" integer,
    "estimatedDaysMax" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "ShippingMethod_pkey" PRIMARY KEY (id)
);

CREATE TABLE "Order" (
    id text NOT NULL,
    "orderNumber" text NOT NULL,
    "userId" text,
    "guestEmail" text,
    status "OrderStatus" DEFAULT 'PENDING'::"OrderStatus" NOT NULL,
    "paymentStatus" "PaymentStatus" DEFAULT 'UNPAID'::"PaymentStatus" NOT NULL,
    "paymentMethod" "PaymentMethod",
    "stripePaymentIntentId" text,
    currency text DEFAULT 'XOF'::text NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    "taxAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "shippingAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    "discountAmount" numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) NOT NULL,
    "shippingAddressId" text,
    "billingAddressId" text,
    notes text,
    "wcId" integer,
    locale "Locale" DEFAULT 'fr'::"Locale" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "shippingMethodId" text,
    "shippingCarrier" text,
    "trackingNumber" text,
    "shippedAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "customerFirstName" text,
    "customerLastName" text,
    "customerPhone" text,

    CONSTRAINT "Order_pkey" PRIMARY KEY (id),
    CONSTRAINT "Order_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "Address"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT "Order_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT "Order_shippingMethodId_fkey" FOREIGN KEY ("shippingMethodId") REFERENCES "ShippingMethod"(id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE "Product" (
    id text NOT NULL,
    slug text NOT NULL,
    sku text,
    price numeric(10,2) NOT NULL,
    "compareAtPrice" numeric(10,2),
    stock integer DEFAULT 0 NOT NULL,
    "manageStock" boolean DEFAULT true NOT NULL,
    status "ProductStatus" DEFAULT 'DRAFT'::"ProductStatus" NOT NULL,
    "featuredImageUrl" text,
    "wcId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY (id)
);

CREATE TABLE "OrderItem" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "productId" text NOT NULL,
    "variantId" text,
    quantity integer NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    "totalPrice" numeric(10,2) NOT NULL,
    "productName" text NOT NULL,
    "productSku" text,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY (id),
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE "Page" (
    id text NOT NULL,
    slug text NOT NULL,
    template text,
    status "ProductStatus" DEFAULT 'DRAFT'::"ProductStatus" NOT NULL,
    "wpId" integer,
    "parentId" text,
    "menuOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY (id),
    CONSTRAINT "Page_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Page"(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE "PageTranslation" (
    id text NOT NULL,
    "pageId" text NOT NULL,
    locale "Locale" NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    content text NOT NULL,
    excerpt text,
    "metaTitle" text,
    "metaDescription" text,

    CONSTRAINT "PageTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "PageTranslation_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "Payment" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    method "PaymentMethod" NOT NULL,
    "externalId" text,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'XOF'::text NOT NULL,
    status "PaymentStatus" DEFAULT 'UNPAID'::"PaymentStatus" NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY (id),
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON DELETE CASCADE
);

CREATE TABLE "PressMention" (
    id text NOT NULL,
    title text NOT NULL,
    source text NOT NULL,
    "sourceUrl" text NOT NULL,
    "logoUrl" text,
    "featuredImageUrl" text,
    excerpt text,
    date timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "PressMention_pkey" PRIMARY KEY (id)
);

CREATE TABLE "ProductAttribute" (
    id text NOT NULL,
    "productId" text NOT NULL,
    name text NOT NULL,
    value text NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY (id),
    CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ProductCategory" (
    "productId" text NOT NULL,
    "categoryId" text NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId", "categoryId"),
    CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ProductImage" (
    id text NOT NULL,
    "productId" text NOT NULL,
    "imageUrl" text NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY (id),
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "Tag" (
    id text NOT NULL,
    slug text NOT NULL,
    "wpId" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY (id)
);

CREATE TABLE "ProductTag" (
    "productId" text NOT NULL,
    "tagId" text NOT NULL,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId", "tagId"),
    CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ProductTranslation" (
    id text NOT NULL,
    "productId" text NOT NULL,
    locale "Locale" NOT NULL,
    name text NOT NULL,
    description text,
    "shortDescription" text,
    slug text NOT NULL,
    "metaTitle" text,
    "metaDescription" text,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ProductVariant" (
    id text NOT NULL,
    "productId" text NOT NULL,
    sku text,
    price numeric(10,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    options jsonb NOT NULL,
    "wcId" integer,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY (id),
    CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "Project" (
    id text NOT NULL,
    slug text NOT NULL,
    "featuredImageUrl" text,
    gallery jsonb DEFAULT '[]'::jsonb,
    "completedAt" timestamp(3) without time zone,
    "clientName" text,
    country text,
    status "ProductStatus" DEFAULT 'PUBLISHED'::"ProductStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY (id)
);

CREATE TABLE "ProjectTranslation" (
    id text NOT NULL,
    "projectId" text NOT NULL,
    locale "Locale" NOT NULL,
    title text NOT NULL,
    summary text,
    content text,
    "metaTitle" text,
    "metaDescription" text,

    CONSTRAINT "ProjectTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "ProjectTranslation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "Quote" (
    id text NOT NULL,
    name text NOT NULL,
    surname text,
    email text NOT NULL,
    phone text,
    company text,
    "orderType" text NOT NULL,
    quantity integer,
    "deliveryDate" timestamp(3) without time zone,
    message text NOT NULL,
    status text DEFAULT 'NEW'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY (id)
);

CREATE TABLE "RefundRequest" (
    id text NOT NULL,
    "orderId" text NOT NULL,
    "paymentId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text NOT NULL,
    reason text NOT NULL,
    status "RefundStatus" DEFAULT 'PENDING'::"RefundStatus" NOT NULL,
    "providerRefundId" text,
    "idempotencyKey" text NOT NULL,
    "requestedBy" text NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "errorMessage" text,
    "manualReference" text,
    "justificationUrl" text,

    CONSTRAINT "RefundRequest_pkey" PRIMARY KEY (id),
    CONSTRAINT "RefundRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT "RefundRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT "RefundRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE "Service" (
    id text NOT NULL,
    slug text NOT NULL,
    icon text,
    status "ProductStatus" DEFAULT 'PUBLISHED'::"ProductStatus" NOT NULL,
    "menuOrder" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY (id)
);

CREATE TABLE "ServiceTranslation" (
    id text NOT NULL,
    "serviceId" text NOT NULL,
    locale "Locale" NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    "metaTitle" text,
    "metaDescription" text,

    CONSTRAINT "ServiceTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "ServiceTranslation_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ShippingMethodTranslation" (
    id text NOT NULL,
    "methodId" text NOT NULL,
    locale "Locale" NOT NULL,
    name text NOT NULL,
    description text,

    CONSTRAINT "ShippingMethodTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "ShippingMethodTranslation_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "ShippingMethod"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ShippingZone" (
    id text NOT NULL,
    code text NOT NULL,
    "isDefault" boolean DEFAULT false NOT NULL,
    priority integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY (id)
);

CREATE TABLE "ShippingRate" (
    id text NOT NULL,
    "zoneId" text NOT NULL,
    "methodId" text NOT NULL,
    "flatFee" numeric(10,2) NOT NULL,
    "freeAbove" numeric(10,2),
    currency text DEFAULT 'XOF'::text NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY (id),
    CONSTRAINT "ShippingRate_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "ShippingMethod"(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "ShippingRate_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ShippingZoneRule" (
    id text NOT NULL,
    "zoneId" text NOT NULL,
    country text NOT NULL,
    region text,
    "postalCodePattern" text,

    CONSTRAINT "ShippingZoneRule_pkey" PRIMARY KEY (id),
    CONSTRAINT "ShippingZoneRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "ShippingZoneTranslation" (
    id text NOT NULL,
    "zoneId" text NOT NULL,
    locale "Locale" NOT NULL,
    name text NOT NULL,

    CONSTRAINT "ShippingZoneTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "ShippingZoneTranslation_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "TagTranslation" (
    id text NOT NULL,
    "tagId" text NOT NULL,
    locale "Locale" NOT NULL,
    name text NOT NULL,

    CONSTRAINT "TagTranslation_pkey" PRIMARY KEY (id),
    CONSTRAINT "TagTranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE "UserSession" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY (id),
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ── Index ───────────────────────────────────────────────────────────────────
CREATE INDEX "ArtistTranslation_locale_idx" ON "ArtistTranslation" USING btree (locale);
CREATE INDEX "CategoryTranslation_locale_idx" ON "CategoryTranslation" USING btree (locale);
CREATE INDEX "FestivalTranslation_locale_idx" ON "FestivalTranslation" USING btree (locale);
CREATE INDEX "Order_trackingNumber_idx" ON "Order" USING btree ("trackingNumber") WHERE ("trackingNumber" IS NOT NULL);
CREATE INDEX "PageTranslation_locale_idx" ON "PageTranslation" USING btree (locale);
CREATE INDEX "Payment_externalId_idx" ON "Payment" USING btree ("externalId");
CREATE INDEX "Payment_orderId_idx" ON "Payment" USING btree ("orderId");
CREATE INDEX "ProductTranslation_locale_idx" ON "ProductTranslation" USING btree (locale);
CREATE INDEX "RefundRequest_orderId_idx" ON "RefundRequest" USING btree ("orderId");
CREATE INDEX "RefundRequest_paymentId_idx" ON "RefundRequest" USING btree ("paymentId");
CREATE INDEX "ShippingZoneRule_country_idx" ON "ShippingZoneRule" USING btree (country);
CREATE INDEX "UserSession_tokenHash_idx" ON "UserSession" USING btree ("tokenHash");
CREATE UNIQUE INDEX "ArtistArtwork_artistId_imageUrl_key" ON "ArtistArtwork" USING btree ("artistId", "imageUrl");
CREATE UNIQUE INDEX "ArtistTranslation_artistId_locale_key" ON "ArtistTranslation" USING btree ("artistId", locale);
CREATE UNIQUE INDEX "Artist_slug_key" ON "Artist" USING btree (slug);
CREATE UNIQUE INDEX "Artist_userId_key" ON "Artist"("userId");
CREATE UNIQUE INDEX "Artist_wpId_key" ON "Artist" USING btree ("wpId");
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation" USING btree ("categoryId", locale);
CREATE UNIQUE INDEX "Category_slug_key" ON "Category" USING btree (slug);
CREATE UNIQUE INDEX "Category_wpId_key" ON "Category" USING btree ("wpId");
CREATE UNIQUE INDEX "FestivalArtist_festivalEditionId_artistId_key" ON "FestivalArtist" USING btree ("festivalEditionId", "artistId");
CREATE UNIQUE INDEX "FestivalEdition_slug_key" ON "FestivalEdition" USING btree (slug);
CREATE UNIQUE INDEX "FestivalEdition_wpId_key" ON "FestivalEdition" USING btree ("wpId");
CREATE UNIQUE INDEX "FestivalTranslation_festivalEditionId_locale_key" ON "FestivalTranslation" USING btree ("festivalEditionId", locale);
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order" USING btree ("orderNumber");
CREATE UNIQUE INDEX "Order_stripePaymentIntentId_key" ON "Order" USING btree ("stripePaymentIntentId");
CREATE UNIQUE INDEX "Order_wcId_key" ON "Order" USING btree ("wcId");
CREATE UNIQUE INDEX "PageTranslation_locale_slug_key" ON "PageTranslation" USING btree (locale, slug);
CREATE UNIQUE INDEX "PageTranslation_pageId_locale_key" ON "PageTranslation" USING btree ("pageId", locale);
CREATE UNIQUE INDEX "Page_slug_key" ON "Page" USING btree (slug);
CREATE UNIQUE INDEX "Page_wpId_key" ON "Page" USING btree ("wpId");
CREATE UNIQUE INDEX "ProductImage_productId_imageUrl_key" ON "ProductImage" USING btree ("productId", "imageUrl");
CREATE UNIQUE INDEX "ProductTranslation_locale_slug_key" ON "ProductTranslation" USING btree (locale, slug);
CREATE UNIQUE INDEX "ProductTranslation_productId_locale_key" ON "ProductTranslation" USING btree ("productId", locale);
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant" USING btree (sku);
CREATE UNIQUE INDEX "ProductVariant_wcId_key" ON "ProductVariant" USING btree ("wcId");
CREATE UNIQUE INDEX "Product_sku_key" ON "Product" USING btree (sku);
CREATE UNIQUE INDEX "Product_slug_key" ON "Product" USING btree (slug);
CREATE UNIQUE INDEX "Product_wcId_key" ON "Product" USING btree ("wcId");
CREATE UNIQUE INDEX "ProjectTranslation_projectId_locale_key" ON "ProjectTranslation" USING btree ("projectId", locale);
CREATE UNIQUE INDEX "Project_slug_key" ON "Project" USING btree (slug);
CREATE UNIQUE INDEX "RefundRequest_idempotencyKey_key" ON "RefundRequest" USING btree ("idempotencyKey");
CREATE UNIQUE INDEX "ServiceTranslation_serviceId_locale_key" ON "ServiceTranslation" USING btree ("serviceId", locale);
CREATE UNIQUE INDEX "Service_slug_key" ON "Service" USING btree (slug);
CREATE UNIQUE INDEX "ShippingMethodTranslation_methodId_locale_key" ON "ShippingMethodTranslation" USING btree ("methodId", locale);
CREATE UNIQUE INDEX "ShippingMethod_code_key" ON "ShippingMethod" USING btree (code);
CREATE UNIQUE INDEX "ShippingRate_zoneId_methodId_key" ON "ShippingRate" USING btree ("zoneId", "methodId");
CREATE UNIQUE INDEX "ShippingZoneTranslation_zoneId_locale_key" ON "ShippingZoneTranslation" USING btree ("zoneId", locale);
CREATE UNIQUE INDEX "ShippingZone_code_key" ON "ShippingZone" USING btree (code);
CREATE UNIQUE INDEX "ShippingZone_isDefault_key" ON "ShippingZone" USING btree ("isDefault") WHERE ("isDefault" = true);
CREATE UNIQUE INDEX "TagTranslation_tagId_locale_key" ON "TagTranslation" USING btree ("tagId", locale);
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag" USING btree (slug);
CREATE UNIQUE INDEX "Tag_wpId_key" ON "Tag" USING btree ("wpId");
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession" USING btree ("tokenHash");
CREATE UNIQUE INDEX "User_emailVerificationToken_key" ON "User" USING btree ("emailVerificationToken");
CREATE UNIQUE INDEX "User_email_key" ON "User" USING btree (email);
CREATE INDEX "User_artistClaimStatus_idx" ON "User"("artistClaimStatus") WHERE "artistClaimStatus" = 'PENDING';
CREATE UNIQUE INDEX "User_resetToken_key" ON "User" USING btree ("resetToken");
CREATE UNIQUE INDEX "User_wcId_key" ON "User" USING btree ("wcId");
