mod utils;

use ipnetwork::IpNetwork;
use maxminddb::geoip2;
use serde::Serialize;
use std::collections::BTreeMap;
use std::net::IpAddr;
#[cfg(feature = "talc")]
use talc::*;
use tsify_next::Tsify;
use wasm_bindgen::prelude::*;

#[cfg(feature = "talc")]
static mut ARENA: [u8; 10000] = [0; 10000];

#[cfg(feature = "talc")]
#[global_allocator]
static ALLOCATOR: talc::Talck<spin::Mutex<()>, ClaimOnOom> = talc::Talc::new(unsafe {
    ClaimOnOom::new(Span::from_array(core::ptr::addr_of!(ARENA).cast_mut()))
})
.lock();

/// Metadata about the MaxMind database.
///
/// @example
/// ```js
/// const metadata = maxmind.getMetadata();
/// console.log(metadata.databaseType); // "GeoIP2-City"
/// console.log(metadata.buildEpoch); // 1234567890
/// ```
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct Metadata {
    pub binary_format_major_version: u16,
    pub binary_format_minor_version: u16,
    pub build_epoch: u64,
    pub database_type: String,
    pub description: BTreeMap<String, String>,
    pub ip_version: u16,
    pub languages: Vec<String>,
    pub node_count: u32,
    pub record_size: u16,
}
impl Metadata {
    pub fn new(db: &maxminddb::Reader<Vec<u8>>) -> Metadata {
        let metadata = &db.metadata;
        Metadata {
            binary_format_major_version: metadata.binary_format_major_version.clone(),
            binary_format_minor_version: metadata.binary_format_minor_version.clone(),
            build_epoch: metadata.build_epoch.clone(),
            database_type: metadata.database_type.clone(),
            description: metadata.description.clone(),
            ip_version: metadata.ip_version.clone(),
            languages: metadata.languages.clone(),
            node_count: metadata.node_count.clone(),
            record_size: metadata.record_size.clone(),
        }
    }
}

/// Record containing city information including name and geoname ID.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CityRecord {
    #[tsify(optional)]
    pub geoname_id: Option<u32>,
    #[tsify(optional)]
    pub names: Option<BTreeMap<String, String>>,
}

/// Record containing continent information including code, geoname ID, and localized names.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct ContinentRecord {
    #[tsify(optional)]
    pub code: Option<String>,
    #[tsify(optional)]
    pub geoname_id: Option<u32>,
    #[tsify(optional)]
    pub names: Option<BTreeMap<String, String>>,
}

/// Record containing country information including ISO code, geoname ID, and localized names.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CountryRecord {
    #[tsify(optional)]
    pub geoname_id: Option<u32>,
    #[tsify(optional)]
    pub iso_code: Option<String>,
    #[tsify(optional)]
    pub names: Option<BTreeMap<String, String>>,
}

/// Record containing subdivision (state/province) information including ISO code, geoname ID, and localized names.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct SubdivisionRecord {
    #[tsify(optional)]
    pub geoname_id: Option<u32>,
    #[tsify(optional)]
    pub iso_code: Option<String>,
    #[tsify(optional)]
    pub names: Option<BTreeMap<String, String>>,
}

/// Record containing location information including latitude, longitude, and timezone.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct LocationRecord {
    #[tsify(optional)]
    pub latitude: Option<f64>,
    #[tsify(optional)]
    pub longitude: Option<f64>,
    #[tsify(optional)]
    pub time_zone: Option<String>,
}

/// Response containing city-level geolocation data for an IP address.
///
/// @example
/// ```js
/// const response = maxmind.lookup_city("8.8.8.8");
/// console.log(response.city?.names?.en); // "Mountain View"
/// console.log(response.country?.isoCode); // "US"
/// console.log(response.location?.latitude); // 37.4223
/// ```
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CityResponse {
    #[tsify(optional)]
    pub city: Option<CityRecord>,
    #[tsify(optional)]
    pub continent: Option<ContinentRecord>,
    #[tsify(optional)]
    pub country: Option<CountryRecord>,
    #[tsify(optional)]
    pub subdivisions: Option<Vec<SubdivisionRecord>>,
    #[tsify(optional)]
    pub location: Option<LocationRecord>,
}

/// Response containing city-level geolocation data and the network prefix length for an IP address.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct PrefixResponse {
    pub city: CityResponse,
    pub prefix_length: usize,
}

/// Response containing ISP / ASN data and the network prefix length for an IP address.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct IspPrefixResponse {
    pub isp: IspResponse,
    pub prefix_length: usize,
}

/// Record containing autonomous system number and organization (when present in the DB).
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct AsnResponse {
    #[tsify(optional)]
    pub as_num: Option<u32>,
    #[tsify(optional)]
    pub as_organization: Option<String>,
}

/// Response containing ISP / ASN fields for an IP address (GeoIP2-ISP or GeoLite2-ASN style DB).
///
/// @example
/// ```js
/// const response = maxmind.lookup_isp("8.8.8.8");
/// console.log(response.asn?.as_num); // 15169
/// console.log(response.asn?.as_organization); // "Google LLC"
/// console.log(response.isp); // "Google LLC"
/// console.log(response.organization); // "Google LLC"
/// ```
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct IspResponse {
    #[tsify(optional)]
    pub asn: Option<AsnResponse>,
    #[tsify(optional)]
    pub isp: Option<String>,
    #[tsify(optional)]
    pub organization: Option<String>,
    #[tsify(optional)]
    pub mobile_country_code: Option<String>,
    #[tsify(optional)]
    pub mobile_network_code: Option<String>,
}

/// MaxMind database reader.
#[wasm_bindgen]
pub struct Maxmind {
    db: maxminddb::Reader<Vec<u8>>,
}

fn map_mm_err(err: maxminddb::MaxMindDbError) -> JsError {
    JsError::new(&err.to_string())
}

fn names_to_btree(names: &geoip2::Names) -> Option<BTreeMap<String, String>> {
    if names.is_empty() {
        return None;
    }
    let mut m = BTreeMap::new();
    if let Some(s) = names.german {
        m.insert("de".into(), s.to_string());
    }
    if let Some(s) = names.english {
        m.insert("en".into(), s.to_string());
    }
    if let Some(s) = names.spanish {
        m.insert("es".into(), s.to_string());
    }
    if let Some(s) = names.french {
        m.insert("fr".into(), s.to_string());
    }
    if let Some(s) = names.japanese {
        m.insert("ja".into(), s.to_string());
    }
    if let Some(s) = names.brazilian_portuguese {
        m.insert("pt-BR".into(), s.to_string());
    }
    if let Some(s) = names.russian {
        m.insert("ru".into(), s.to_string());
    }
    if let Some(s) = names.simplified_chinese {
        m.insert("zh-CN".into(), s.to_string());
    }
    if m.is_empty() {
        None
    } else {
        Some(m)
    }
}

fn convert_city_response(city_record: &geoip2::City) -> CityResponse {
    let city = {
        let c = &city_record.city;
        if c.geoname_id.is_none() && c.names.is_empty() {
            None
        } else {
            Some(CityRecord {
                geoname_id: c.geoname_id,
                names: names_to_btree(&c.names),
            })
        }
    };
    let continent = {
        let c = &city_record.continent;
        if c.code.is_none() && c.geoname_id.is_none() && c.names.is_empty() {
            None
        } else {
            Some(ContinentRecord {
                code: c.code.map(|s| s.to_string()),
                geoname_id: c.geoname_id,
                names: names_to_btree(&c.names),
            })
        }
    };
    let country = {
        let c = &city_record.country;
        if c.geoname_id.is_none() && c.iso_code.is_none() && c.names.is_empty() {
            None
        } else {
            Some(CountryRecord {
                geoname_id: c.geoname_id,
                iso_code: c.iso_code.map(|s| s.to_string()),
                names: names_to_btree(&c.names),
            })
        }
    };
    let subdivisions = if city_record.subdivisions.is_empty() {
        None
    } else {
        Some(
            city_record
                .subdivisions
                .iter()
                .map(|sub| SubdivisionRecord {
                    geoname_id: sub.geoname_id,
                    iso_code: sub.iso_code.map(|s| s.to_string()),
                    names: names_to_btree(&sub.names),
                })
                .collect(),
        )
    };
    let location = {
        let loc = &city_record.location;
        if loc.latitude.is_none() && loc.longitude.is_none() && loc.time_zone.is_none() {
            None
        } else {
            Some(LocationRecord {
                latitude: loc.latitude,
                longitude: loc.longitude,
                time_zone: loc.time_zone.map(|s| s.to_string()),
            })
        }
    };
    CityResponse {
        city,
        continent,
        country,
        subdivisions,
        location,
    }
}

fn prefix_len(net: IpNetwork) -> usize {
    match net {
        IpNetwork::V4(n) => usize::from(n.prefix()),
        IpNetwork::V6(n) => usize::from(n.prefix()),
    }
}

fn convert_isp_response(isp_record: geoip2::Isp) -> IspResponse {
    let asn =
        if isp_record.autonomous_system_number.is_none()
            && isp_record.autonomous_system_organization.is_none()
        {
            None
        } else {
            Some(AsnResponse {
                as_num: isp_record.autonomous_system_number,
                as_organization: isp_record
                    .autonomous_system_organization
                    .map(|s| s.to_string()),
            })
        };
    IspResponse {
        asn,
        isp: isp_record.isp.map(|s| s.to_string()),
        organization: isp_record.organization.map(|s| s.to_string()),
        mobile_country_code: isp_record.mobile_country_code.map(|s| s.to_string()),
        mobile_network_code: isp_record.mobile_network_code.map(|s| s.to_string()),
    }
}

/// MaxMind database reader.
#[wasm_bindgen]
impl Maxmind {
    /// Creates a new MaxMind database reader from a binary database file.
    ///
    /// @example
    /// ```js
    /// const db = new Maxmind(dbBinary);
    /// ```
    #[wasm_bindgen(constructor)]
    pub fn new(
        #[wasm_bindgen(param_description = "The binary database file as a Uint8Array")] js_db: Box<
            [u8],
        >,
    ) -> Maxmind {
        let local_arr: Vec<u8> = js_db.into_vec();
        Maxmind {
            db: maxminddb::Reader::from_source(local_arr).expect_throw("Invalid Database Binary"),
        }
    }

    /// Looks up city-level geolocation data for an IP address.
    ///
    /// @example
    /// ```js
    /// const response = maxmind.lookup_city("8.8.8.8");
    /// console.log(response.city?.names?.en); // "Mountain View"
    /// console.log(response.country?.isoCode); // "US"
    /// ```
    #[wasm_bindgen(return_description = "City-level geolocation data for the IP address")]
    pub fn lookup_city(
        &self,
        #[wasm_bindgen(param_description = "IPv4 or IPv6 address to look up")] ip_str: &str,
    ) -> Result<CityResponse, JsError> {
        let ip_addr: IpAddr = ip_str.parse().map_err(|_| JsError::new("Invalid IP"))?;
        let lr = self.db.lookup(ip_addr).map_err(map_mm_err)?;
        let city = lr
            .decode::<geoip2::City>()
            .map_err(map_mm_err)?
            .ok_or_else(|| JsError::new("Result Not Found"))?;
        Ok(convert_city_response(&city))
    }

    /// Looks up ISP / ASN data for an IP address. Requires a compatible database (e.g. GeoLite2-ASN, GeoIP2-ISP).
    ///
    /// @example
    /// ```js
    /// const response = maxmind.lookup_isp("8.8.8.8");
    /// console.log(response.asn?.as_num);
    /// console.log(response.isp);
    /// ```
    #[wasm_bindgen(return_description = "ISP / ASN data for the IP address")]
    pub fn lookup_isp(
        &self,
        #[wasm_bindgen(param_description = "IPv4 or IPv6 address to look up")] ip_str: &str,
    ) -> Result<IspResponse, JsError> {
        let ip_addr: IpAddr = ip_str.parse().map_err(|_| JsError::new("Invalid IP"))?;
        let lr = self.db.lookup(ip_addr).map_err(map_mm_err)?;
        let isp = lr
            .decode::<geoip2::Isp>()
            .map_err(map_mm_err)?
            .ok_or_else(|| JsError::new("Result Not Found"))?;
        Ok(convert_isp_response(isp))
    }

    /// Looks up city-level geolocation data and prefix length for an IP address.
    ///
    /// @example
    /// ```js
    /// const response = maxmind.lookup_prefix("8.8.8.8");
    /// console.log(response.city?.names?.en); // "Mountain View"
    /// console.log(response.prefixLength); // 24
    /// ```
    #[wasm_bindgen(return_description = "City-level geolocation data and network prefix length")]
    pub fn lookup_prefix(
        &self,
        #[wasm_bindgen(param_description = "IPv4 or IPv6 address to look up")] ip_str: &str,
    ) -> Result<PrefixResponse, JsError> {
        let ip_addr: IpAddr = ip_str.parse().map_err(|_| JsError::new("Invalid IP"))?;
        let lr = self.db.lookup(ip_addr).map_err(map_mm_err)?;
        let prefix_length = prefix_len(lr.network().map_err(map_mm_err)?);
        let city = lr
            .decode::<geoip2::City>()
            .map_err(map_mm_err)?
            .ok_or_else(|| JsError::new("Result Not Found"))?;
        Ok(PrefixResponse {
            city: convert_city_response(&city),
            prefix_length,
        })
    }

    /// Looks up ISP / ASN data and prefix length for an IP address.
    ///
    /// @example
    /// ```js
    /// const response = maxmind.lookup_isp_prefix("8.8.8.8");
    /// console.log(response.isp?.asn?.as_num);
    /// console.log(response.prefixLength);
    /// ```
    #[wasm_bindgen(return_description = "ISP / ASN data and network prefix length")]
    pub fn lookup_isp_prefix(
        &self,
        #[wasm_bindgen(param_description = "IPv4 or IPv6 address to look up")] ip_str: &str,
    ) -> Result<IspPrefixResponse, JsError> {
        let ip_addr: IpAddr = ip_str.parse().map_err(|_| JsError::new("Invalid IP"))?;
        let lr = self.db.lookup(ip_addr).map_err(map_mm_err)?;
        let prefix_length = prefix_len(lr.network().map_err(map_mm_err)?);
        let isp = lr
            .decode::<geoip2::Isp>()
            .map_err(map_mm_err)?
            .ok_or_else(|| JsError::new("Result Not Found"))?;
        Ok(IspPrefixResponse {
            isp: convert_isp_response(isp),
            prefix_length,
        })
    }

    /// Gets metadata about the loaded MaxMind database.
    ///
    /// @example
    /// ```js
    /// const metadata = maxmind.getMetadata();
    /// console.log(metadata.databaseType); // "GeoIP2-City"
    /// console.log(metadata.buildEpoch); // 1234567890
    /// ```
    #[wasm_bindgen(getter = metadata, return_description = "Metadata about the loaded database")]
    pub fn get_metadata(&self) -> Result<Metadata, JsError> {
        let metadata = Metadata::new(&self.db);
        Ok(metadata)
    }
}

/// Initialize the MaxMind database reader.
#[wasm_bindgen(start)]
pub fn run() -> Result<(), JsValue> {
    utils::set_panic_hook();
    Ok(())
}
