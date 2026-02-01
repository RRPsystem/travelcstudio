=== TravelC Content ===
Contributors: rrpsystem
Tags: travel, content, supabase, news, destinations
Requires at least: 5.8
Tested up to: 6.4
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Synchroniseert nieuws en bestemmingen van TravelCStudio naar WordPress.

== Description ==

TravelC Content haalt automatisch nieuws en bestemmingen op uit TravelCStudio (Supabase) en toont deze op je WordPress website. 

**Hoe het werkt:**

1. Admin maakt content (nieuws/bestemmingen) in TravelCStudio
2. Brand activeert gewenste content via toggle
3. WordPress toont automatisch de geactiveerde content

**Features:**

* Automatische sync met TravelCStudio
* Per-brand content activatie
* Nieuws overzicht en detail pagina's
* Bestemmingen met mega menu support
* Responsive design
* Makkelijk te stylen met CSS variabelen

== Installation ==

1. Upload de `travelc-content` folder naar `/wp-content/plugins/`
2. Activeer de plugin via 'Plugins' menu in WordPress
3. Ga naar Instellingen → TravelC Content
4. Vul in:
   - Supabase URL (standaard al ingevuld)
   - Supabase Anon Key (uit je Supabase project)
   - Brand ID (de UUID van deze brand in TravelCStudio)
5. Test de connectie

== Shortcodes ==

**Nieuws overzicht:**
`[travelc_news limit="10" columns="3" show_image="yes" show_excerpt="yes"]`

**Enkel nieuwsartikel:**
`[travelc_news_single slug="artikel-slug"]`

**Bestemmingspagina:**
`[travelc_destination slug="peru"]`

**Bestemmingen mega menu:**
`[travelc_destinations_menu group_by="continent"]`

== Frequently Asked Questions ==

= Waar vind ik de Brand ID? =

Log in op TravelCStudio als operator/admin, ga naar Brand Management, en kopieer de UUID van de brand.

= Waar vind ik de Supabase Anon Key? =

In je Supabase dashboard: Settings → API → anon/public key

= Content wordt niet getoond =

Controleer of:
1. De brand ID correct is ingevuld
2. De content is geactiveerd voor deze brand in TravelCStudio
3. De content status op "published" staat

== Changelog ==

= 1.0.0 =
* Eerste release
* Nieuws shortcodes
* Bestemmingen shortcodes
* Mega menu support
* Admin settings pagina
* Connectie test functie

== Upgrade Notice ==

= 1.0.0 =
Eerste release van TravelC Content plugin.
