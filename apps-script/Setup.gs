function inicializarProyecto() {
  var lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    var book = db_();
    if (!props_().getProperty('PIN_PEPPER')) props_().setProperty('PIN_PEPPER',random_());
    Object.keys(SCHEMA_).forEach(function (name) {
      var sheet = book.getSheetByName(name) || book.insertSheet(name);
      if (sheet.getLastRow() === 0) {sheet.getRange(1,1,1,SCHEMA_[name].length).setValues([SCHEMA_[name]]); sheet.setFrozenRows(1);}
      rows_(name); // Validar esquema antes de escribir datos.
    });
    var names = ['Augusto','Dulzura Frita','Melany','Francisco','Mateo','Facundo','Ignacio','Aramis','Juan Meny','Nahuel Plasencia','Candes','Girman','Pipiola','Lucas','Guillermino','Luis','Meli','Marcelo'];
    // Una marca por tabla evita recrear filas que el organizador haya eliminado deliberadamente.
    if (!props_().getProperty('SEEDED_GUESTS')) {
      var guests = rows_('Invitados');
      names.forEach(function (name,n) {if (!guests.some(function (g) {return g.id === 'g' + (n+1) || g.nombre === name;})) putRow_('Invitados',{id:'g'+(n+1),nombre:name,pinHash:'',activo:true});});
      props_().setProperty('SEEDED_GUESTS','true');
    }
    if (!props_().getProperty('SEEDED_INGREDIENTS')) {
      var groups = [
        ['Aderezos',[['Mayonesa',1000,'g',250,200],['Mostaza',500,'g',250,80],['Kétchup',500,'g',250,120],['Picantina',200,'g',100,50],['Barbacoa',350,'g',175,150],['Mayonesa de ajo',250,'g',125,100]]],
        ['Quesos y fiambres',[['Muzarela',1500,'g',250,615],['Paleta',900,'g',100,450],['Salame',300,'g',100,240],['Panceta',500,'g',100,430],['Cheddar',300,'g',100,240]]],
        ['Verduras y complementos',[['Cebollas',5,'unidades',1,50],['Tomates',1000,'g',250,100],['Lechuga',2,'unidades',1,100],['Aceitunas',300,'g',100,120],['Morrones',500,'g',250,110],['Papas pay',350,'g',175,220],['Pepinillos',300,'g',100,150],['Cebolla crispy',150,'g',75,90],['Limones',500,'g',250,70],['Orégano',1,'sobre',1,20]]],
        ['Tortas fritas',[['Dulce de leche',750,'g',250,205],['Azúcar',500,'g',250,25]]]
      ];
      var existing = rows_('Ingredientes');
      groups.forEach(function (group) {group[1].forEach(function (i) {
        var id = i[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ /g,'-');
        if (!existing.some(function (r) {return r.id === id || r.nombre === i[0];})) putRow_('Ingredientes',{id:id,nombre:i[0],categoria:group[0],cantidadRequerida:i[1],unidad:i[2],incremento:i[3],precioTotal:i[4],activo:true});
      });});
      props_().setProperty('SEEDED_INGREDIENTS','true');
    }
    var defaults = {fecha:'',ubicacion:'Playa a confirmar',horario:'Después del almuerzo',merienda:'17:00',cena:'21:00',personas:'20',presupuestoMin:'200',presupuestoMax:'500',modificaciones:'true'}, current = config_();
    Object.keys(defaults).forEach(function (key) {if (current[key] === undefined) putRow_('Configuracion',{clave:key,valor:defaults[key]},'clave');});
    return {invitados:rows_('Invitados').length,ingredientes:rows_('Ingredientes').length};
  } finally {lock.releaseLock();}
}
