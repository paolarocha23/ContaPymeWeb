import React, { useState, useRef, useEffect } from 'react';
import * as Lucide from 'lucide-react';

import {
  CONTACTO, NAV_LINKS, CATEGORIAS, BENEFICIOS, PLATAFORMAS, PASOS, FAQS
} from './landingData';

import './Landing.css';

// Si tu versión de lucide-react es más vieja, algunos íconos tienen otro nombre.
const ALIAS = {
  FileChartColumn: ['FileChartColumn', 'FileBarChart'],
  ChartLine: ['ChartLine', 'LineChart'],
  ContactRound: ['ContactRound', 'Contact', 'Users']
};

function Icono({ name, size = 24 }) {
  const candidatos = ALIAS[name] || [name];
  const Componente = candidatos.map(n => Lucide[n]).find(Boolean) || Lucide.Circle;
  return <Componente size={size} />;
}

/* ───────── Barra de navegación ───────── */
function Navbar({ onLogin }) {
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  return (
    <header className="lp-nav">
      <a href="#inicio" className="lp-nav-logo" onClick={cerrar}>
        <img src="img/logo-blanco.png" alt="ContaPyme" />
      </a>

      <nav className={`lp-nav-links${abierto ? ' open' : ''}`}>
        {NAV_LINKS.map(l => (
          <a key={l.id} href={`#${l.id}`} onClick={cerrar}>{l.label}</a>
        ))}

        {/* Los botones se repiten aquí para el menú móvil */}
        <div className="lp-nav-acts lp-only-mobile">
          <button type="button" className="lp-btn lp-sm lp-out" onClick={onLogin}>Iniciar sesión</button>
          <a href="#contacto" className="lp-btn lp-sm lp-white" onClick={cerrar}>Contáctanos</a>
        </div>
      </nav>

      <div className="lp-nav-acts lp-only-desktop">
        <button type="button" className="lp-btn lp-sm lp-out" onClick={onLogin}>Iniciar sesión</button>
        <a href="#contacto" className="lp-btn lp-sm lp-white">Contáctanos</a>
      </div>

      <button
        type="button"
        className="lp-burger"
        onClick={() => setAbierto(v => !v)}
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
      >
        {abierto ? <Lucide.X size={24} /> : <Lucide.Menu size={24} />}
      </button>
    </header>
  );
}

/* ───────── Hero ───────── */
function Hero({ onLogin }) {
  return (
    <section id="inicio" className="lp-hero">
      <img className="lp-hero-bg" src="img/landing.png" alt="" />
      <div className="lp-hero-ov" />

      <Navbar onLogin={onLogin} />

      <div className="lp-hero-txt">
        
        <h1>Controla tu negocio, <span>impulsa tu crecimiento</span></h1>

        <p>
          ContaPyme es el sistema para pequeñas y medianas empresas que reúne ventas,
          compras, inventario y finanzas en un solo lugar, para que dejes de depender de
          hojas de cálculo dispersas y tomes decisiones con información al día.
        </p>

        <a href="#funciones" className="lp-btn lp-pri">
          Conoce ContaPyme <Lucide.ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}

/* ───────── Encabezado reutilizable de sección ───────── */
function Encabezado({ etiqueta, titulo, texto, claro }) {
  return (
    <div className={`lp-head${claro ? ' lp-head-light' : ''}`}>
      <span className="lp-eyebrow">{etiqueta}</span>
      <h2>{titulo}</h2>
      {texto && <p>{texto}</p>}
    </div>
  );
}

/* ───────── 3. Módulos ───────── */
function Funciones() {
  return (
    <section id="funciones" className="lp-sec lp-bg-soft">
      <div className="lp-wrap">
        <Encabezado
          etiqueta="Funciones"
          titulo="¿Qué puedes administrar?"
          texto="Todos los módulos que necesita tu negocio, organizados y conectados entre sí."
        />
        <div className="lp-grid lp-g4">
          {CATEGORIAS.map(c => (
            <article key={c.titulo} className="lp-cat">
              <div className="lp-tile"><Icono name={c.icon} size={26} /></div>
              <h3>{c.titulo}</h3>
              <p>{c.texto}</p>
              <ul>
                {c.items.map(t => (
                  <li key={t}><i><Lucide.Check size={13} /></i>{t}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── 4. Beneficios ───────── */
function Beneficios() {
  return (
    <section id="beneficios" className="lp-sec lp-bg-dark">
      <div className="lp-wrap">
        <Encabezado
          claro
          etiqueta="Beneficios"
          titulo="¿Por qué elegir ContaPyme?"
          texto="Menos tiempo capturando y más claridad para decidir."
        />
        <div className="lp-grid lp-g4">
          {BENEFICIOS.map(b => (
            <article key={b.titulo} className="lp-glass">
              <div className="lp-glass-ico"><Icono name={b.icon} /></div>
              <h3>{b.titulo}</h3>
              <p>{b.texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── 5. Web y móvil ───────── */
function Plataformas() {
  return (
    <section id="nosotros" className="lp-sec">
      <div className="lp-wrap">
        <Encabezado
          etiqueta="Plataformas"
          titulo="Disponible en web y móvil"
          texto="Administra desde la computadora y agiliza lo cotidiano desde el celular."
        />
        <div className="lp-grid lp-g2">
          {PLATAFORMAS.map(p => (
            <article key={p.titulo} className={`lp-plat${p.destacada ? ' lp-plat-dark' : ''}`}>
              <div className="lp-plat-top">
                <div className="lp-tile"><Icono name={p.icon} size={26} /></div>
                <span className={`lp-badge ${p.estado === 'Disponible' ? 'ok' : 'dev'}`}>{p.estado}</span>
              </div>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
              <ul>
                {p.puntos.map(t => (
                  <li key={t}><i><Lucide.Check size={14} /></i>{t}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────── 6. Cómo comenzar ───────── */
function Pasos() {
  return (
    <section className="lp-sec lp-bg-soft">
      <div className="lp-wrap">
        <Encabezado
          etiqueta="Cómo empezar"
          titulo="¿Cómo comenzar a utilizar ContaPyme?"
          texto="Cinco pasos sencillos, acompañados por nuestro equipo desde el primer contacto."
        />
        <ol className="lp-steps">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className="lp-step">
              <span className="lp-step-n">{i + 1}</span>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
            </li>
          ))}
        </ol>
        <div className="lp-cta">
          <a href="#contacto" className="lp-btn lp-pri">
            Solicitar información <Lucide.ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────── 7. Preguntas frecuentes ───────── */
function Preguntas() {
  const [abierta, setAbierta] = useState(0);

  return (
    <section className="lp-sec">
      <div className="lp-wrap">
        <Encabezado etiqueta="FAQ" titulo="Preguntas frecuentes" />
        <div className="lp-faq">
          {FAQS.map((f, i) => {
            const open = abierta === i;
            return (
              <div key={f.pregunta} className={`lp-q${open ? ' open' : ''}`}>
                <button
                  type="button"
                  className="lp-q-row"
                  aria-expanded={open}
                  onClick={() => setAbierta(open ? -1 : i)}
                >
                  <span>{f.pregunta}</span>
                  <span className="lp-q-ch"><Lucide.ChevronDown size={18} /></span>
                </button>
                {open && <div className="lp-q-a">{f.respuesta}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ───────── 8. Contacto ───────── */
const FORM_VACIO = { nombre: '', empresa: '', correo: '', mensaje: '' };

function Contacto() {
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [enviado, setEnviado] = useState(false);

  const cambiar = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  // Aún no hay endpoint para recibir solicitudes: abrimos el correo del usuario ya redactado.
  // Cuando exista POST /api/contacto, reemplaza el bloque marcado.
  const enviar = (e) => {
    e.preventDefault();

    if (!form.nombre.trim() || !form.correo.trim() || !form.mensaje.trim()) {
      setError('Completa tu nombre, correo y mensaje.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.correo.trim())) {
      setError('Escribe un correo electrónico válido.');
      return;
    }

    // ── reemplazar desde aquí ──
    const cuerpo = `Nombre: ${form.nombre}\nEmpresa: ${form.empresa || '—'}\nCorreo: ${form.correo}\n\n${form.mensaje}`;
    window.location.href =
      `mailto:${CONTACTO.correo}?subject=${encodeURIComponent('Solicitud de información ContaPyme')}&body=${encodeURIComponent(cuerpo)}`;
    // ── hasta aquí ──

    setEnviado(true);
    setForm(FORM_VACIO);
  };

  return (
    <section id="contacto" className="lp-sec lp-bg-tint">
      <div className="lp-wrap lp-contact">
        <div>
          <span className="lp-eyebrow lp-eyebrow-white">Contacto</span>
          <h2 className="lp-h2-left">Hablemos de tu negocio</h2>
          <p className="lp-lead-left">
            Cuéntanos qué necesitas y te explicamos cómo ContaPyme puede ayudarte.
          </p>

          <div className="lp-cinfo">
            <div className="lp-ci"><span className="lp-ci-t"><Lucide.Mail size={22} /></span>
              <div><small>Correo electrónico</small><b>{CONTACTO.correo}</b></div></div>
            <div className="lp-ci"><span className="lp-ci-t"><Lucide.MessageCircle size={22} /></span>
              <div><small>Teléfono / WhatsApp</small><b>{CONTACTO.telefono}</b></div></div>
            <div className="lp-ci"><span className="lp-ci-t"><Lucide.Clock size={22} /></span>
              <div><small>Horario de atención</small><b>{CONTACTO.horario}</b></div></div>
          </div>
        </div>

        <form className="lp-form" onSubmit={enviar} noValidate>
          <h3>Solicita información</h3>
          <p className="lp-form-sub">Déjanos tus datos y te contactaremos a la brevedad.</p>

          {error && <div className="lp-form-msg err" role="alert">{error}</div>}
          {enviado && !error && (
            <div className="lp-form-msg ok" role="status">
              ¡Gracias! Se abrió tu correo con la solicitud lista para enviar.
            </div>
          )}

          <div className="lp-fg">
            <label className="lp-f">Nombre
              <input name="nombre" value={form.nombre} onChange={cambiar} placeholder="Tu nombre completo" autoComplete="name" />
            </label>
            <label className="lp-f">Empresa
              <input name="empresa" value={form.empresa} onChange={cambiar} placeholder="Nombre de tu empresa" autoComplete="organization" />
            </label>
            <label className="lp-f lp-full">Correo electrónico
              <input name="correo" type="email" value={form.correo} onChange={cambiar} placeholder="correo@empresa.com" autoComplete="email" />
            </label>
            <label className="lp-f lp-full">Mensaje
              <textarea name="mensaje" rows={4} value={form.mensaje} onChange={cambiar} placeholder="¿Cómo podemos ayudarte?" />
            </label>
          </div>

          <button type="submit" className="lp-btn lp-pri lp-block">
            Enviar solicitud <Lucide.Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}

/* ───────── 9. Pie de página ───────── */
function Footer() {
  return (
    <footer className="lp-foot">
      <div className="lp-wrap">
        <div className="lp-fgrid">
          <div>
            <img src="/logo-blanco.png" alt="ContaPyme" />
            <p className="lp-fdesc">
              Sistema de administración y contabilidad para pequeñas y medianas empresas.
            </p>
          </div>
          <div>
            <h4>Navegación</h4>
            <ul>
              <li><a href="#inicio">Inicio</a></li>
              <li><a href="#funciones">Funciones</a></li>
              <li><a href="#contacto">Contacto</a></li>
            </ul>
          </div>
          <div>
            <h4>Contacto</h4>
            <ul>
              <li>{CONTACTO.correo}</li>
              <li>{CONTACTO.telefono}</li>
              <li>{CONTACTO.horario}</li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              {/* Cambia los href cuando tengas las páginas de aviso y términos */}
              <li><a href="#privacidad">Aviso de privacidad</a></li>
              <li><a href="#terminos">Términos y condiciones</a></li>
            </ul>
          </div>
        </div>

        <div className="lp-fbot">
          <span>© {new Date().getFullYear()} ContaPyme. Todos los derechos reservados.</span>
          <span>Hecho en México</span>
        </div>
      </div>
    </footer>
  );
}

/* ───────── Página completa ───────── */
export default function LandingView({ onLogin }) {
  return (
    <div className="lp">
      <Hero onLogin={onLogin} />
      <Funciones />
      <Beneficios />
      <Plataformas />
      <Pasos />
      <Preguntas />
      <Contacto />
      <Footer />
    </div>
  );
}
