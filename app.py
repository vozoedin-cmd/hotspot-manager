"""
VoucherForge Pro v7 — CuzoNet Hotspot Management Suite
Sistema Profesional de Gestión de Fichas y Hotspot para MikroTik
Autor: KJ — CuzoNet
"""

from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import os
import secrets
import string
import logging
import requests
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Configurar logging profesional
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('VoucherForge')

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'cuzonet-hotspot-secret-2024')

# Configuración de base de datos
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///hotspot.db')
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ============== MODELOS ==============

class LoteFichas(db.Model):
    """Modelo para Historial de Lotes (VoucherForge style)"""
    __tablename__ = 'lotes'
    id = db.Column(db.Integer, primary_key=True)
    id_lote = db.Column(db.String(20), unique=True)
    perfil = db.Column(db.String(50))
    servidor = db.Column(db.String(50))
    cantidad = db.Column(db.Integer)
    vendidos = db.Column(db.Integer, default=0)
    precio_lote = db.Column(db.Float, default=0)
    fecha = db.Column(db.DateTime, default=datetime.now)
    fichas = db.relationship('Ficha', backref='lote', lazy=True)

class Ficha(db.Model):
    """Modelo para Fichas (Vouchers) de Hotspot"""
    __tablename__ = 'fichas'
    
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(20))
    perfil = db.Column(db.String(50), nullable=False)
    precio = db.Column(db.Float, default=0)
    comentario = db.Column(db.String(100))
    estado = db.Column(db.String(20), default='disponible')  # disponible, vendida, usada
    fecha_creacion = db.Column(db.DateTime, default=datetime.now)
    vendido_el = db.Column(db.DateTime)
    vendedor = db.Column(db.String(50))
    lote_id = db.Column(db.Integer, db.ForeignKey('lotes.id'), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'password': self.password,
            'perfil': self.perfil,
            'precio': self.precio,
            'comentario': self.comentario,
            'estado': self.estado,
            'fecha_creacion': self.fecha_creacion.strftime('%Y-%m-%d %H:%M'),
            'vendido_el': self.vendido_el.strftime('%Y-%m-%d %H:%M') if self.vendido_el else None,
            'id_lote': self.lote.id_lote if self.lote else None
        }

class PerfilLink(db.Model):
    """Configuración de planes (perfiles) de Hotspot Avanzados"""
    __tablename__ = 'perfiles'
    
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), unique=True, nullable=False)
    precio = db.Column(db.Float, default=0)
    tiempo = db.Column(db.String(20))      # limit-uptime
    velocidad = db.Column(db.String(20))  # rate-limit
    limite_datos = db.Column(db.String(20)) # limit-bytes-total (ej: 1G)
    validez = db.Column(db.String(20))      # Validez después del primer uso (ej: 30d)
    shared_users = db.Column(db.Integer, default=1)
    color = db.Column(db.String(20), default='#667eea')
    
    # Automatización
    auto_eliminar = db.Column(db.Boolean, default=True)
    vender_como = db.Column(db.String(20), default='pin') # pin, user_pass
    
    # Scripts PRO
    on_login = db.Column(db.Text)
    on_logout = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'precio': self.precio,
            'tiempo': self.tiempo,
            'velocidad': self.velocidad,
            'limite_datos': self.limite_datos,
            'validez': self.validez,
            'shared_users': self.shared_users,
            'color': self.color,
            'auto_eliminar': self.auto_eliminar,
            'vender_como': self.vender_como,
            'on_login': self.on_login,
            'on_logout': self.on_logout
        }

class ConfigMikroTik(db.Model):
    """Configuración de conexión a MikroTik"""
    __tablename__ = 'config_mikrotik'
    
    id = db.Column(db.Integer, primary_key=True)
    host = db.Column(db.String(100), nullable=False)
    port = db.Column(db.Integer, default=80)
    username = db.Column(db.String(50), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    use_ssl = db.Column(db.Boolean, default=False)
    activo = db.Column(db.Boolean, default=True)
    server_hotspot = db.Column(db.String(50), default='all')

# ============== MIKROTIK API ==============

class MikroTikHotspotAPI:
    def __init__(self, host, username, password, port=80, use_ssl=False):
        self.base_url = f"{'https' if use_ssl else 'http'}://{host}:{port}/rest"
        self.session = requests.Session()
        self.session.auth = (username, password)
        self.session.verify = False

    def test_connection(self):
        try:
            r = self.session.get(f"{self.base_url}/system/identity", timeout=10)
            return r.status_code == 200, r.json().get('name', 'MikroTik') if r.status_code == 200 else r.text
        except Exception as e:
            return False, str(e)

    def get_hotspot_servers(self):
        try:
            r = self.session.get(f"{self.base_url}/ip/hotspot", timeout=10)
            return (True, r.json()) if r.status_code == 200 else (False, [])
        except Exception as e:
            return False, []

    def get_profiles(self):
        try:
            r = self.session.get(f"{self.base_url}/ip/hotspot/user/profile", timeout=10)
            return (True, r.json()) if r.status_code == 200 else (False, r.text)
        except Exception as e:
            return False, str(e)

    def create_user(self, name, password, profile, server="all", limit_uptime=None, comment=""):
        try:
            data = {
                "name": name,
                "password": password,
                "profile": profile,
                "server": server,
                "comment": comment
            }
            if limit_uptime:
                data["limit-uptime"] = limit_uptime
            
            r = self.session.put(f"{self.base_url}/ip/hotspot/user", json=data, timeout=15)
            return (True, r.json().get('.id')) if r.status_code in [200, 201] else (False, r.text)
        except Exception as e:
            return False, str(e)

    def get_active_users(self):
        try:
            r = self.session.get(f"{self.base_url}/ip/hotspot/active", timeout=10)
            return (True, r.json()) if r.status_code == 200 else (False, r.text)
        except Exception as e:
            return False, str(e)

    def delete_user(self, user_id):
        try:
            r = self.session.delete(f"{self.base_url}/ip/hotspot/user/{user_id}", timeout=10)
            return r.status_code in [200, 204]
        except:
            return False

    def create_update_profile(self, name, rate_limit=None, shared_users=1, on_login="", on_logout=""):
        try:
            data = {
                "name": name,
                "shared-users": str(shared_users),
                "on-login": on_login or "",
                "on-logout": on_logout or ""
            }
            if rate_limit:
                data["rate-limit"] = rate_limit
            
            # Verificar si existe
            check = self.session.get(f"{self.base_url}/ip/hotspot/user/profile?name={name}", timeout=10)
            if check.status_code == 200 and len(check.json()) > 0:
                profile_id = check.json()[0]['.id']
                r = self.session.patch(f"{self.base_url}/ip/hotspot/user/profile/{profile_id}", json=data, timeout=15)
            else:
                r = self.session.put(f"{self.base_url}/ip/hotspot/user/profile", json=data, timeout=15)
                
            return (True, r.json()) if r.status_code in [200, 201] else (False, r.text)
        except Exception as e:
            return False, str(e)

    def delete_profile(self, name):
        try:
            check = self.session.get(f"{self.base_url}/ip/hotspot/user/profile?name={name}", timeout=10)
            if check.status_code == 200 and len(check.json()) > 0:
                profile_id = check.json()[0]['.id']
                r = self.session.delete(f"{self.base_url}/ip/hotspot/user/profile/{profile_id}", timeout=10)
                return r.status_code in [200, 204]
            return False
        except:
            return False

    def get_system_resources(self):
        try:
            r = self.session.get(f"{self.base_url}/system/resource", timeout=10)
            return (True, r.json()) if r.status_code == 200 else (False, r.text)
        except Exception as e:
            return False, str(e)

    def get_system_identity(self):
        try:
            r = self.session.get(f"{self.base_url}/system/identity", timeout=10)
            return (True, r.json()) if r.status_code == 200 else (False, r.text)
        except Exception as e:
            return False, str(e)

    def get_system_routerboard(self):
        try:
            r = self.session.get(f"{self.base_url}/system/routerboard", timeout=10)
            return (True, r.json()) if r.status_code == 200 else (False, r.text)
        except Exception as e:
            return False, str(e)

def get_api():
    config = ConfigMikroTik.query.filter_by(activo=True).first()
    if not config: return None
    return MikroTikHotspotAPI(config.host, config.username, config.password, config.port, config.use_ssl)

# ============== RUTAS ==============

@app.route('/')
def index():
    api = get_api()
    config = ConfigMikroTik.query.first()
    
    stats = {
        'active': 0, 
        'total_fichas': 0, 
        'fichas_disponibles': 0,
        'fichas_vendidas': 0,
        'ingresos': 0
    }
    active_users = []
    router_info = None
    system_res = None
    
    if api:
        success, active = api.get_active_users()
        if success:
            stats['active'] = len(active)
            active_users = active
        
        # Info del router
        ok_id, identity = api.get_system_identity()
        ok_res, resources = api.get_system_resources()
        ok_rb, routerboard = api.get_system_routerboard()
        
        if ok_id or ok_res:
            router_info = {
                'identity': identity.get('name', '?') if ok_id else '?',
                'host': config.host if config else '?',
                'version': resources.get('version', '?') if ok_res else '?',
                'board': resources.get('board-name', '?') if ok_res else '?',
                'uptime': resources.get('uptime', '?') if ok_res else '?',
                'serial': routerboard.get('serial-number', '?') if ok_rb else '?',
                'cpu_load': resources.get('cpu-load', 0) if ok_res else 0,
                'free_memory': resources.get('free-memory', 0) if ok_res else 0,
                'total_memory': resources.get('total-memory', 1) if ok_res else 1,
            }
    
    stats['total_fichas'] = Ficha.query.count()
    stats['fichas_disponibles'] = Ficha.query.filter_by(estado='disponible').count()
    stats['fichas_vendidas'] = Ficha.query.filter_by(estado='vendida').count()
    
    # Calcular ingresos
    from sqlalchemy import func
    ingresos = db.session.query(func.sum(Ficha.precio)).filter_by(estado='vendida').scalar()
    stats['ingresos'] = ingresos or 0
    
    # Plan más rentable y popular
    plan_rentable = db.session.query(Ficha.perfil, func.sum(Ficha.precio).label('total')).filter_by(estado='vendida').group_by(Ficha.perfil).order_by(func.sum(Ficha.precio).desc()).first()
    plan_popular = db.session.query(Ficha.perfil, func.count(Ficha.id).label('total')).filter_by(estado='vendida').group_by(Ficha.perfil).order_by(func.count(Ficha.id).desc()).first()
    stats['plan_rentable'] = plan_rentable[0] if plan_rentable else None
    stats['plan_popular'] = plan_popular[0] if plan_popular else None
    
    # Planes
    planes = PerfilLink.query.all()
    
    # Lotes
    lotes = LoteFichas.query.order_by(LoteFichas.fecha.desc()).limit(10).all()
    
    # Hotspot Servers
    hotspot_servers = []
    if api:
        ok_srv, servers = api.get_hotspot_servers()
        if ok_srv: hotspot_servers = servers
    
    return render_template('index.html', 
                         stats=stats, 
                         active_users=active_users,
                         router_info=router_info,
                         planes=planes,
                         config=config,
                         lotes=lotes,
                         hotspot_servers=hotspot_servers,
                         now=datetime.now())

@app.route('/fichas')
def fichas_view():
    perfiles = PerfilLink.query.all()
    lotes = LoteFichas.query.order_by(LoteFichas.fecha.desc()).all()
    mikrotik_profiles = []
    hotspot_servers = []
    api = get_api()
    if api:
        success, profiles = api.get_profiles()
        if success: mikrotik_profiles = profiles
        ok_srv, servers = api.get_hotspot_servers()
        if ok_srv: hotspot_servers = servers

    # Soporte de filtro por lote en la URL (?lote=IDLOTE)
    lote_filtro = request.args.get('lote')
    lote_activo = None
    fichas_lote = []
    if lote_filtro:
        lote_activo = LoteFichas.query.filter_by(id_lote=lote_filtro).first()
        if lote_activo:
            fichas_lote = Ficha.query.filter_by(lote_id=lote_activo.id).order_by(Ficha.fecha_creacion.asc()).all()

    return render_template('fichas.html',
                         lotes=lotes,
                         perfiles=perfiles,
                         mikrotik_profiles=mikrotik_profiles,
                         hotspot_servers=hotspot_servers,
                         lote_activo=lote_activo,
                         fichas_lote=fichas_lote)

@app.route('/api/generar-fichas', methods=['POST'])
def generar_fichas():
    try:
        data = request.json
        cantidad = int(data.get('cantidad', 1))
        perfil = data.get('perfil')
        servidor = data.get('servidor', 'all')
        longitud = int(data.get('longitud', 6))
        prefijo = data.get('prefijo', '')
        tipo = data.get('tipo', 'usuario_password')
        precio = float(data.get('precio', 0))
        nota = data.get('comentario', '')

        if not perfil:
            return jsonify({'success': False, 'error': 'Debe seleccionar un perfil/plan.'}), 400
        if cantidad < 1 or cantidad > 500:
            return jsonify({'success': False, 'error': 'La cantidad debe estar entre 1 y 500.'}), 400

        api = get_api()
        if not api:
            return jsonify({'success': False, 'error': 'MikroTik no configurado. Vaya a Configuración.'}), 400

        # Crear el Lote
        id_lote = secrets.token_hex(4).upper()
        nuevo_lote = LoteFichas(
            id_lote=id_lote,
            perfil=perfil,
            servidor=servidor,
            cantidad=cantidad,
            precio_lote=precio
        )
        db.session.add(nuevo_lote)
        db.session.flush()

        creadas = 0
        errores = 0
        for _ in range(cantidad):
            if tipo == 'pin':
                codigo = prefijo + ''.join(secrets.choice(string.digits) for _ in range(longitud))
                password = codigo
            else:
                codigo = prefijo + ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(longitud))
                password = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(longitud))

            # Crear en MikroTik con servidor específico
            success, mt_id = api.create_user(codigo, password, perfil, server=servidor, comment=f"Lote:{id_lote} {nota}")
            
            if success:
                ficha = Ficha(
                    codigo=codigo,
                    password=password,
                    perfil=perfil,
                    precio=precio,
                    lote_id=nuevo_lote.id
                )
                db.session.add(ficha)
                creadas += 1
            else:
                errores += 1
                logger.warning(f'Error creando ficha en MikroTik: {mt_id}')

        db.session.commit()
        logger.info(f'Lote {id_lote} generado: {creadas}/{cantidad} fichas creadas, {errores} errores.')
        return jsonify({'success': True, 'creadas': creadas, 'errores': errores, 'lote_id': id_lote})
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error generando fichas: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/configuracion')
def configuracion():
    config = ConfigMikroTik.query.first()
    perfiles = PerfilLink.query.all()
    return render_template('configuracion.html', config=config, perfiles=perfiles)

@app.route('/api/mikrotik/status')
def get_mikrotik_status():
    api = get_api()
    if not api:
        return jsonify({'success': False, 'status': 'no_config', 'msg': 'No configurado'})
    
    success, identity = api.test_connection()
    if success:
        return jsonify({'success': True, 'status': 'online', 'identity': identity})
    else:
        return jsonify({'success': False, 'status': 'offline', 'error': str(identity)})

@app.route('/api/mikrotik/resources')
def get_mikrotik_resources():
    try:
        api = get_api()
        config = ConfigMikroTik.query.first()
        if not api:
            return jsonify({'success': False})
        
        ok_res, resources = api.get_system_resources()
        ok_rb, routerboard = api.get_system_routerboard()
        
        if ok_res:
            return jsonify({
                'success': True,
                'host': config.host if config else '?',
                'board': resources.get('board-name', '?'),
                'version': resources.get('version', '?'),
                'uptime': resources.get('uptime', '?'),
                'serial': routerboard.get('serial-number', '?') if ok_rb else '?',
                'cpu_load': resources.get('cpu-load', 0),
                'cpu_frequency': resources.get('cpu-frequency', ''),
                'free_memory': resources.get('free-memory', 0),
                'total_memory': resources.get('total-memory', 1),
            })
        return jsonify({'success': False})
    except Exception as e:
        logger.error(f'Error obteniendo recursos MikroTik: {e}')
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/config/mikrotik', methods=['POST'])
def save_config():
    data = request.json
    config = ConfigMikroTik.query.first() or ConfigMikroTik()
    config.host = data['host']
    config.username = data['username']
    config.password = data['password']
    config.port = int(data.get('port', 80))
    config.use_ssl = data.get('use_ssl', False)
    
    db.session.add(config)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/planes')
def planes_view():
    planes = PerfilLink.query.all()
    lotes = LoteFichas.query.order_by(LoteFichas.fecha.desc()).limit(10).all()
    
    mikrotik_profiles = []
    hotspot_servers = []
    api = get_api()
    if api:
        success, profiles = api.get_profiles()
        if success: mikrotik_profiles = profiles
        ok_srv, servers = api.get_hotspot_servers()
        if ok_srv: hotspot_servers = servers
    
    # Build helper dicts for template
    planes_names = [p.nombre for p in planes]
    planes_colors = {p.nombre: p.color for p in planes}
    
    # System logs (dynamic)
    system_logs = []
    if api:
        system_logs.append({'color': 'green', 'text': f'Base de datos cargada: {len(planes)} planes registrados.', 'time': datetime.now().strftime('%I:%M:%S %p')})
        if mikrotik_profiles:
            system_logs.append({'color': 'green', 'text': f'{len(mikrotik_profiles)} perfil(es) encontrado(s) en MikroTik.', 'time': datetime.now().strftime('%I:%M:%S %p')})
        if hotspot_servers:
            system_logs.append({'color': 'green', 'text': f'{len(hotspot_servers)} servidor(es) Hotspot encontrado(s).', 'time': datetime.now().strftime('%I:%M:%S %p')})
    
    return render_template('planes.html', 
                         planes=planes,
                         lotes=lotes,
                         mikrotik_profiles=mikrotik_profiles,
                         hotspot_servers=hotspot_servers,
                         planes_names=planes_names,
                         planes_colors=planes_colors,
                         system_logs=system_logs,
                         now=datetime.now())

@app.route('/api/planes', methods=['POST'])
def save_plan():
    try:
        data = request.json
        plan_id = data.get('id')
        nombre = data.get('nombre', '').strip()
        
        if not nombre:
            return jsonify({'success': False, 'error': 'El nombre del perfil es obligatorio.'}), 400
        
        if plan_id:
            plan = PerfilLink.query.get(plan_id)
            if not plan:
                return jsonify({'success': False, 'error': 'Plan no encontrado.'}), 404
        else:
            # Verificar nombre duplicado
            existing = PerfilLink.query.filter_by(nombre=nombre).first()
            if existing:
                return jsonify({'success': False, 'error': f'Ya existe un plan con el nombre "{nombre}".'}), 400
            plan = PerfilLink(nombre=nombre)
            
        plan.nombre = nombre
        plan.precio = float(data.get('precio', 0))
        plan.tiempo = data.get('tiempo', '')
        plan.velocidad = data.get('velocidad', '')
        plan.limite_datos = data.get('limite_datos', '')
        plan.validez = data.get('validez', '')
        plan.shared_users = int(data.get('shared_users', 1))
        plan.color = data.get('color', '#6366f1')
        plan.vender_como = data.get('vender_como', 'pin')
        plan.auto_eliminar = data.get('auto_eliminar', True)
        
        # =========================================================================
        # GENERADOR DE SCRIPTS MIKROTIK ULTRA-PRO (VOUCHER-ISP LEVEL)
        # =========================================================================
        on_login = data.get('on_login', '').strip()
        if not on_login:
            # Bloque de Gestión de Metadata y Activación
            metadata_logic = (
                f':local u $user;\r\n'
                f':local currentEmail [/ip hotspot user get [find name=$u] email];\r\n'
                f':if ([:len $currentEmail] = 0) do={{\r\n'
                f'  :local d [/system clock get date]; :local t [/system clock get time];\r\n'
                f'  :local cleanD ""; :for i from=0 to=([:len $d] - 1) do={{ :local c [:pick $d $i]; :if ($c = "/") do={{:set c "-"}}; :set cleanD ($cleanD . $c) }}\r\n'
                f'  :local cleanT ""; :for i from=0 to=([:len $t] - 1) do={{ :local c [:pick $t $i]; :if ($c = ":") do={{:set c "-"}}; :set cleanT ($cleanT . $c) }}\r\n'
                f'  :local activationTag ("$cleanD" . "_" . "$cleanT" . "@pro.active");\r\n'
                f'  /ip hotspot user set [find name=$u] email=$activationTag;\r\n'
                f'}}\r\n'
            )

            # Bloque de MAC-BINDING Estricto (Seguridad Avanzada)
            mac_binding_logic = (
                f':local macConnected $"mac-address";\r\n'
                f':local userMac [/ip hotspot user get [find name=$user] mac-address];\r\n'
                f':if ($userMac = "00:00:00:00:00:00" || [:len $userMac] = 0) do={{\r\n'
                f'  :log info ("PRO-BIND: Vinculando usuario \'$user\' a la MAC \'$macConnected\'");\r\n'
                f'  /ip hotspot user set [find name=$user] mac-address=$macConnected;\r\n'
                f'}} else={{\r\n'
                f'  :if ($userMac != $macConnected) do={{\r\n'
                f'    :log error ("PRO-BIND: Acceso denegado para \'$user\'. MAC registrada: \'$userMac\', intento desde: \'$macConnected\'");\r\n'
                f'    /ip hotspot active remove [find user=$user];\r\n'
                f'  }}\r\n'
                f'}}\r\n'
            )

            # Bloque de Caducidad (Scheduler)
            validez_logic = ""
            if plan.validez:
                validez_logic = (
                    f':if ([:len [/system scheduler find name="$user"]] = 0) do={{\r\n'
                    f'  /system scheduler add name="$user" interval={plan.validez} on-event="/ip hotspot user remove [find name=$user]; /system scheduler remove [find name=$user]" start-time=startup\r\n'
                    f'}}\r\n'
                )

            on_login = (
                f'# BEGIN VOUCHERFORGE PRO MANAGED BLOCK\r\n'
                f'{metadata_logic}'
                f'{mac_binding_logic}'
                f'{validez_logic}'
                f'# END VOUCHERFORGE PRO MANAGED BLOCK'
            )
        
        on_logout = data.get('on_logout', '').strip()
        if not on_logout:
            on_logout = f':log info "PRO-LOGOUT: Usuario $user finalizó sesión"'
        
        plan.on_login = on_login
        plan.on_logout = on_logout
        
        # Sincronizar con MikroTik
        api = get_api()
        if api:
            success, error = api.create_update_profile(
                plan.nombre, 
                plan.velocidad, 
                plan.shared_users,
                plan.on_login,
                plan.on_logout
            )
            if not success:
                logger.error(f'Error sincronizando plan "{nombre}" con MikroTik: {error}')
                return jsonify({'success': False, 'error': f'MikroTik: {error}'}), 400
        else:
            logger.warning(f'Plan "{nombre}" guardado solo en BD (sin conexión MikroTik).')
                
        if not plan_id:
            db.session.add(plan)
            
        db.session.commit()
        logger.info(f'Plan "{nombre}" guardado exitosamente.')
        return jsonify({'success': True, 'plan': plan.to_dict()})
    except Exception as e:
        db.session.rollback()
        logger.error(f'Error guardando plan: {e}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/planes/<int:id>', methods=['DELETE'])
def delete_plan(id):
    plan = PerfilLink.query.get_or_404(id)
    api = get_api()
    if api:
        api.delete_profile(plan.nombre)
    db.session.delete(plan)
    db.session.commit()
    return jsonify({'success': True})

# ============== LOTES Y FICHAS (CRUD) ==============

@app.route('/api/lotes/<int:id>', methods=['DELETE'])
def delete_lote(id):
    """Elimina un lote y todas sus fichas (en BD y en MikroTik)."""
    lote = LoteFichas.query.get_or_404(id)
    api = get_api()
    fichas = Ficha.query.filter_by(lote_id=lote.id).all()
    for ficha in fichas:
        if api:
            try:
                # Intentar eliminar el usuario en MikroTik
                check = api.session.get(f"{api.base_url}/ip/hotspot/user?name={ficha.codigo}", timeout=8)
                if check.status_code == 200 and check.json():
                    user_id = check.json()[0].get('.id')
                    if user_id:
                        api.delete_user(user_id)
            except Exception:
                pass
        db.session.delete(ficha)
    db.session.delete(lote)
    db.session.commit()
    logger.info(f'Lote {lote.id_lote} eliminado junto a {len(fichas)} fichas.')
    return jsonify({'success': True, 'eliminadas': len(fichas)})

@app.route('/api/fichas/<int:id>', methods=['DELETE'])
def delete_ficha(id):
    """Elimina una ficha individual (en BD y en MikroTik)."""
    ficha = Ficha.query.get_or_404(id)
    api = get_api()
    if api:
        try:
            check = api.session.get(f"{api.base_url}/ip/hotspot/user?name={ficha.codigo}", timeout=8)
            if check.status_code == 200 and check.json():
                user_id = check.json()[0].get('.id')
                if user_id:
                    api.delete_user(user_id)
        except Exception as e:
            logger.warning(f'No se pudo eliminar ficha {ficha.codigo} en MikroTik: {e}')
    # Actualizar contador del lote
    if ficha.lote_id:
        lote = LoteFichas.query.get(ficha.lote_id)
        if lote and lote.cantidad > 0:
            lote.cantidad = max(0, lote.cantidad - 1)
    db.session.delete(ficha)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/fichas/<int:id>/vender', methods=['POST'])
def vender_ficha(id):
    """Marca una ficha como vendida."""
    ficha = Ficha.query.get_or_404(id)
    if ficha.estado != 'disponible':
        return jsonify({'success': False, 'error': f'La ficha ya está en estado: {ficha.estado}'}), 400
    data = request.json or {}
    ficha.estado = 'vendida'
    ficha.vendido_el = datetime.now()
    ficha.vendedor = data.get('vendedor', 'Manual')
    # Actualizar contador del lote
    if ficha.lote_id:
        lote = LoteFichas.query.get(ficha.lote_id)
        if lote:
            lote.vendidos = (lote.vendidos or 0) + 1
    db.session.commit()
    logger.info(f'Ficha {ficha.codigo} marcada como vendida.')
    return jsonify({'success': True, 'ficha': ficha.to_dict()})

@app.route('/api/fichas/lote/<string:id_lote>')
def get_fichas_lote(id_lote):
    """Devuelve todas las fichas de un lote en JSON."""
    lote = LoteFichas.query.filter_by(id_lote=id_lote).first_or_404()
    fichas = Ficha.query.filter_by(lote_id=lote.id).order_by(Ficha.fecha_creacion.asc()).all()
    return jsonify({
        'success': True,
        'lote': {
            'id': lote.id,
            'id_lote': lote.id_lote,
            'perfil': lote.perfil,
            'servidor': lote.servidor,
            'cantidad': lote.cantidad,
            'vendidos': lote.vendidos,
        },
        'fichas': [f.to_dict() for f in fichas]
    })

@app.route('/api/backup')
def backup():
    """Exporta todos los datos como JSON descargable."""
    from flask import Response
    import json as _json
    planes = [p.to_dict() for p in PerfilLink.query.all()]
    lotes_raw = LoteFichas.query.order_by(LoteFichas.fecha.desc()).all()
    lotes = []
    for l in lotes_raw:
        lotes.append({
            'id_lote': l.id_lote,
            'perfil': l.perfil,
            'servidor': l.servidor,
            'cantidad': l.cantidad,
            'vendidos': l.vendidos,
            'precio_lote': l.precio_lote,
            'fecha': l.fecha.isoformat() if l.fecha else None,
        })
    fichas = [f.to_dict() for f in Ficha.query.all()]
    config = ConfigMikroTik.query.first()
    config_data = {
        'host': config.host if config else None,
        'port': config.port if config else None,
        'username': config.username if config else None,
        'server_hotspot': config.server_hotspot if config else None,
    }
    payload = {
        'generated_at': datetime.now().isoformat(),
        'version': 'VoucherForge Pro v7',
        'config': config_data,
        'planes': planes,
        'lotes': lotes,
        'fichas': fichas,
    }
    filename = f"voucherforge_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    return Response(
        _json.dumps(payload, ensure_ascii=False, indent=2),
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename={filename}'}
    )

# ============== INIT ==============

def init_db():
    with app.app_context():
        db.create_all()
        # Perfiles iniciales si no existen
        if PerfilLink.query.count() == 0:
            p1 = PerfilLink(nombre='1 Hora', precio=5.0, tiempo='01:00:00', velocidad='2M/5M', color='#3498db', on_login=r'# Script PRO 1h' + '\r\n' + r':log info "Usuario $user conectado 1h"')
            p2 = PerfilLink(nombre='3 Horas', precio=10.0, tiempo='03:00:00', velocidad='3M/5M', color='#2ecc71', on_login=r'# Script PRO 3h')
            p3 = PerfilLink(nombre='1 Dia', precio=25.0, tiempo='24:00:00', velocidad='5M/10M', color='#e67e22', on_login=r'# Script PRO 1d')
            db.session.add_all([p1, p2, p3])
            db.session.commit()

init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5001) # Puerto 5001 para no chocar con el otro
